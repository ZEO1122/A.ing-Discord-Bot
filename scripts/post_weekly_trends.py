from __future__ import annotations

# pyright: reportMissingImports=false

import argparse
from dataclasses import dataclass
import json
import os
from pathlib import Path
import sys

import discord
import yaml


DISCORD_EMBED_FIELD_VALUE_LIMIT = 1024
DISCORD_TOPIC_FIELD_LIMIT = 220
DISCORD_CORE_FIELD_LIMIT = 700
DISCORD_REASON_FIELD_LIMIT = 700
DISCORD_TERMS_FIELD_LIMIT = 320
DISCORD_SOURCE_FIELD_LIMIT = 500

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from scripts.post_trend_brief import (
        NoFreshTrendSourcesError,
        TREND_CAUTION_MESSAGE,
        TrendBrief,
        build_prompt,
        generate_with_openai,
        load_history,
        normalize_generated_brief,
        select_fresh_sources,
        update_history,
        validate_brief,
    )
    from scripts.fetch_trend_sources import fetch_trend_sources
except ImportError:
    from post_trend_brief import (
        NoFreshTrendSourcesError,
        TREND_CAUTION_MESSAGE,
        TrendBrief,
        build_prompt,
        generate_with_openai,
        load_history,
        normalize_generated_brief,
        select_fresh_sources,
        update_history,
        validate_brief,
    )
    from fetch_trend_sources import fetch_trend_sources


@dataclass(slots=True)
class ChannelConfig:
    channel_key: str
    channel_id: str
    webhook_key: str
    enabled: bool
    interests: list[str]
    max_topics: int


@dataclass(slots=True)
class InterestSection:
    interest: str
    brief: TrendBrief


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Post weekly trend briefs to configured channels.")
    parser.add_argument("--channel-map-file", default="config/channel_interest_map.json")
    parser.add_argument("--history-file", default="content/trends/history/published_trends.json")
    parser.add_argument("--channel-key", default="")
    parser.add_argument("--max-results", type=int, default=3)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def load_channel_map(path: Path) -> list[ChannelConfig]:
    data = json.loads(path.read_text(encoding="utf-8"))
    raw_channels = data.get("channels", [])
    if not isinstance(raw_channels, list) or not raw_channels:
        raise RuntimeError("channel_interest_map.json must contain at least one channel.")
    channels: list[ChannelConfig] = []
    for item in raw_channels:
        channels.append(
            ChannelConfig(
                channel_key=str(item["channel_key"]),
                channel_id=str(item["channel_id"]),
                webhook_key=str(item["webhook_key"]),
                enabled=bool(item.get("enabled", True)),
                interests=[str(interest) for interest in item.get("interests", [])],
                max_topics=int(item.get("max_topics", 2)),
            )
        )
    return channels


def load_webhook_map() -> dict[str, str]:
    raw_map = os.getenv("DISCORD_WEBHOOK_MAP_JSON", "")
    if raw_map:
        try:
            parsed = json.loads(raw_map)
        except json.JSONDecodeError:
            parsed = yaml.safe_load(raw_map)
        if not isinstance(parsed, dict) or not parsed:
            raise RuntimeError("DISCORD_WEBHOOK_MAP_JSON must be a non-empty JSON object.")
        return {str(key): str(value) for key, value in parsed.items()}
    fallback_webhook = os.getenv("DISCORD_WEBHOOK_URL", "")
    if fallback_webhook:
        return {"default": fallback_webhook}
    raise RuntimeError("DISCORD_WEBHOOK_MAP_JSON or DISCORD_WEBHOOK_URL is required.")


def history_key(channel_id: str, interest: str) -> str:
    return f"{channel_id}:{interest}"


def build_channel_embed(channel: ChannelConfig, sections: list[InterestSection]) -> discord.Embed:
    embed = discord.Embed(
        title=f"이번 주 관심분야 브리핑 | {channel.channel_key}",
        color=discord.Color.gold(),
    )
    for section in sections:
        source_lines = [f"- {source['title']}: {source['url']}" for source in section.brief.sources[:2]]
        embed.add_field(
            name="주제",
            value=safe_truncate_text(section.brief.title, DISCORD_TOPIC_FIELD_LIMIT),
            inline=False,
        )
        embed.add_field(
            name="핵심 설명",
            value=safe_truncate_text(section.brief.core_explanation, DISCORD_CORE_FIELD_LIMIT),
            inline=False,
        )
        embed.add_field(
            name="왜 중요한가",
            value=safe_truncate_text(section.brief.why_it_matters, DISCORD_REASON_FIELD_LIMIT),
            inline=False,
        )
        embed.add_field(
            name="용어 빠르게 이해하기",
            value=safe_truncate_text(section.brief.quick_terms, DISCORD_TERMS_FIELD_LIMIT),
            inline=False,
        )
        embed.add_field(
            name="생각해볼 질문",
            value=safe_truncate_text(section.brief.discussion_prompt, 120),
            inline=False,
        )
        embed.add_field(
            name="출처",
            value=format_source_value(source_lines),
            inline=False,
        )
    embed.add_field(name="주의", value=TREND_CAUTION_MESSAGE, inline=False)
    return embed


def truncate_text(text: str, limit: int) -> str:
    stripped = text.strip()
    if len(stripped) <= limit:
        return stripped
    if limit <= 1:
        return stripped[:limit]
    return stripped[: limit - 1].rstrip() + "..."


def safe_truncate_text(text: str, limit: int) -> str:
    stripped = text.strip()
    if len(stripped) <= limit:
        return stripped
    if limit <= 3:
        return stripped[:limit]
    search_window = stripped[:limit]
    boundaries = [search_window.rfind(token) for token in [". ", ".\n", "다.", "요.", "! ", "? ", "\n", " "]]
    cut = max(boundaries)
    if cut < int(limit * 0.6):
        return truncate_text(stripped, limit)
    candidate = search_window[: cut + 1].rstrip()
    return truncate_text(candidate, limit)


def format_source_value(source_lines: list[str]) -> str:
    if not source_lines:
        return "출처 없음"
    joined = "\n".join(source_lines)
    if len(joined) <= DISCORD_SOURCE_FIELD_LIMIT:
        return joined

    compact_lines = [safe_truncate_text(line, 220) for line in source_lines[:1]]
    compact_joined = "\n".join(compact_lines)
    return safe_truncate_text(compact_joined, DISCORD_SOURCE_FIELD_LIMIT)


def build_interest_brief(track: str, sources: list[dict[str, str]], api_key: str) -> TrendBrief:
    prompt = build_prompt(track, sources)
    generated = normalize_generated_brief(generate_with_openai(prompt, api_key))
    validate_brief(generated)
    return TrendBrief(
        title=generated["title"],
        core_explanation=generated["core_explanation"],
        why_it_matters=generated["why_it_matters"],
        quick_terms=generated["quick_terms"],
        discussion_prompt=generated["discussion_prompt"],
        sources=sources,
    )


def post_channel_embed(webhook_url: str, channel: ChannelConfig, embed: discord.Embed) -> str:
    webhook = discord.SyncWebhook.from_url(webhook_url)
    message = webhook.send(embed=embed, wait=True)
    return str(message.id)


def main() -> None:
    args = parse_args()
    channel_map = load_channel_map(Path(args.channel_map_file))
    webhook_map = load_webhook_map()
    history_path = Path(args.history_file)
    history = load_history(history_path)
    api_key = os.getenv("OPENAI_API_KEY", "")

    if not args.dry_run and not api_key:
        raise RuntimeError("OPENAI_API_KEY is required.")

    channels = [channel for channel in channel_map if channel.enabled]
    if args.channel_key:
        channels = [channel for channel in channels if channel.channel_key == args.channel_key]

    if not channels:
        if args.channel_key:
            raise RuntimeError(
                f"No enabled channel matched channel_key={args.channel_key}. "
                "Check config/channel_interest_map.json and enabled flags."
            )
        raise RuntimeError(
            "No enabled trend channels configured. "
            "Set enabled=true in config/channel_interest_map.json before running the workflow."
        )

    posted_channels = 0
    skipped_channels = 0
    for channel in channels:
        sections: list[InterestSection] = []
        for interest in channel.interests[: channel.max_topics]:
            fetched_sources = fetch_trend_sources(track=interest, max_results=min(max(args.max_results + 3, args.max_results), 10))
            scoped_history = {interest: history.get(history_key(channel.channel_id, interest), [])}
            print(
                f"interest_status=fetch channel_key={channel.channel_key} interest={interest} fetched_count={len(fetched_sources)} history_count={len(scoped_history.get(interest, []))}"
            )
            try:
                fresh_sources = select_fresh_sources(
                    track=interest,
                    fetched_sources=fetched_sources,
                    history=scoped_history,
                    max_results=args.max_results,
                )
                print(
                    f"interest_status=fresh channel_key={channel.channel_key} interest={interest} fresh_count={len(fresh_sources)}"
                )
            except NoFreshTrendSourcesError as exc:
                print(
                    f"interest_status=skipped channel_key={channel.channel_key} interest={interest} reason={exc}"
                )
                continue
            except Exception as exc:
                raise RuntimeError(
                    f"Failed while preparing trend section for channel_key={channel.channel_key} interest={interest}"
                ) from exc

            if args.dry_run:
                brief = TrendBrief(
                    title=f"{interest.upper()} 최신 동향",
                    core_explanation="최신 source를 수집해 브리핑 초안을 만들 수 있습니다.",
                    why_it_matters="운영 전 채널별 묶음 포맷을 검증하기 위함입니다.",
                    quick_terms="- dry-run: 실제 GPT 호출 없이 포맷만 검증합니다.",
                    discussion_prompt="이 분야에서 이번 주 가장 주목할 점은 무엇일까?",
                    sources=fresh_sources,
                )
            else:
                brief = build_interest_brief(interest, fresh_sources, api_key)
            sections.append(InterestSection(interest=interest, brief=brief))

        if not sections:
            skipped_channels += 1
            print(f"channel_status=skipped channel_key={channel.channel_key} reason=no_fresh_sections")
            continue

        embed = build_channel_embed(channel, sections)
        if args.dry_run:
            print(f"channel_status=dry_run channel_key={channel.channel_key} section_count={len(sections)}")
            continue

        webhook_url = webhook_map.get(channel.webhook_key)
        if not webhook_url:
            raise RuntimeError(f"Missing webhook mapping for webhook_key={channel.webhook_key}")
        message_id = post_channel_embed(webhook_url, channel, embed)
        for section in sections:
            key = history_key(channel.channel_id, section.interest)
            existing = history.get(key, [])
            update_history(history_path, key, section.brief.title, section.brief.sources)
            history[key] = load_history(history_path).get(key, existing)
        posted_channels += 1
        print(f"channel_status=success channel_key={channel.channel_key} message_id={message_id} section_count={len(sections)}")

    if posted_channels == 0 and skipped_channels > 0:
        print("publish_status=skipped reason=no_channels_with_fresh_sections")
    else:
        print(f"publish_status=success posted_channels={posted_channels} skipped_channels={skipped_channels}")


if __name__ == "__main__":
    main()
