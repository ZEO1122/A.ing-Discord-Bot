from __future__ import annotations

# pyright: reportMissingImports=false

import argparse
from dataclasses import dataclass
from datetime import UTC, datetime
import json
from pathlib import Path
import sys
from typing import Any
from urllib import request

import discord

try:
    from scripts.fetch_trend_sources import fetch_trend_sources
except ImportError:
    from fetch_trend_sources import fetch_trend_sources


TREND_CAUTION_MESSAGE = (
    "주의: 이 브리핑은 최신 source를 바탕으로 GPT가 요약한 내용입니다. "
    "해석 오류나 누락 가능성이 있으니 원문 출처를 함께 확인하세요."
)


class NoFreshTrendSourcesError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate and post a trend brief to Discord.")
    parser.add_argument("--track", required=True)
    parser.add_argument("--max-results", type=int, default=5)
    parser.add_argument("--history-file", default="content/trends/history/published_trends.json")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def bootstrap_pythonpath() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))


@dataclass(slots=True)
class TrendBrief:
    title: str
    core_explanation: str
    why_it_matters: str
    quick_terms: str
    discussion_prompt: str
    sources: list[dict[str, str]]


def normalize_source_url(url: str) -> str:
    normalized = url.strip()
    if "arxiv.org/abs/" in normalized:
        prefix, arxiv_id = normalized.split("/abs/", 1)
        arxiv_id = arxiv_id.split("?", 1)[0]
        if "v" in arxiv_id and arxiv_id.rsplit("v", 1)[-1].isdigit():
            arxiv_id = arxiv_id.rsplit("v", 1)[0]
        return f"{prefix}/abs/{arxiv_id}"
    return normalized


def load_history(history_path: Path) -> dict[str, list[dict[str, str]]]:
    if not history_path.exists():
        return {}
    return json.loads(history_path.read_text(encoding="utf-8"))


def select_fresh_sources(
    track: str,
    fetched_sources: list[dict[str, str]],
    history: dict[str, list[dict[str, str]]],
    max_results: int,
) -> list[dict[str, str]]:
    seen_urls = {normalize_source_url(item["url"]) for item in history.get(track, [])}
    fresh_sources = [source for source in fetched_sources if normalize_source_url(source["url"]) not in seen_urls]
    if not fresh_sources:
        raise NoFreshTrendSourcesError(f"No fresh trend sources available for track={track}")
    return fresh_sources[:max_results]


def update_history(
    history_path: Path,
    track: str,
    generated_title: str,
    selected_sources: list[dict[str, str]],
) -> None:
    history = load_history(history_path)
    track_history = history.get(track, [])
    posted_at = datetime.now(UTC).isoformat()
    for source in selected_sources:
        track_history.append(
            {
                "title": generated_title,
                "source_title": source["title"],
                "url": normalize_source_url(source["url"]),
                "published_at": source.get("published_at", ""),
                "posted_at": posted_at,
            }
        )
    history[track] = track_history[-50:]
    history_path.parent.mkdir(parents=True, exist_ok=True)
    history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_prompt(track: str, sources: list[dict[str, str]]) -> str:
    source_lines = "\n".join(f"- {item['title']} | {item['url']} | {item.get('published_at', '')}" for item in sources)
    return (
        "당신은 AI 학술동아리용 브리핑 에디터다.\n"
        f"트랙: {track}\n"
        "아래 출처만 근거로 한국어 브리핑을 작성하라.\n"
        "반드시 JSON으로만 답하라.\n"
        "필수 키: title, core_explanation, why_it_matters, quick_terms, discussion_prompt\n"
        "키 이름은 반드시 영어 snake_case 그대로 사용하라.\n"
        "과장된 일반론, 뜬금없는 응용 시사점, 출처에 없는 주장, 모호한 미래 예측을 쓰지 마라.\n"
        "각 필드는 짧고 읽기 쉽게 작성하라.\n"
        "title: 40자 이내\n"
        "core_explanation: 2~3문장, 350자 이내\n"
        "why_it_matters: 2~3문장, 350자 이내\n"
        "quick_terms: 2~3개 bullet, 총 220자 이내\n"
        "discussion_prompt: 1문장, 80자 이내\n"
        "반드시 아래 JSON 형식을 정확히 지켜라.\n"
        '{"title":"...","core_explanation":"...","why_it_matters":"...","quick_terms":"- 용어: 설명\\n- 용어: 설명","discussion_prompt":"..."}\n'
        "출처를 바꾸거나 추가하지 마라.\n\n"
        f"출처 목록:\n{source_lines}\n"
    )


def generate_with_openai(prompt: str, api_key: str) -> dict[str, str]:
    model = __import__("os").getenv("OPENAI_MODEL", "gpt-5.1")
    payload = {
        "model": model,
        "input": prompt,
        "text": {"format": {"type": "json_object"}},
    }
    req = request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with request.urlopen(req, timeout=60) as response:
        data = json.loads(response.read().decode("utf-8"))

    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                return json.loads(content["text"])
    raise RuntimeError("OpenAI response did not contain output_text.")


def normalize_generated_brief(data: dict[str, Any]) -> dict[str, str]:
    alias_groups = {
        "title": ["title", "제목"],
        "core_explanation": [
            "core_explanation",
            "coreExplanation",
            "what_happened",
            "whatHappened",
            "summary_detail",
            "summary",
            "one_line",
            "oneLine",
            "무슨_내용인가",
            "무슨 내용인가",
            "핵심요약",
            "핵심 요약",
            "핵심 설명",
        ],
        "why_it_matters": [
            "why_it_matters",
            "whyItMatters",
            "importance",
            "why_important",
            "왜_중요한가",
            "왜 중요한가",
            "의미",
        ],
        "quick_terms": [
            "quick_terms",
            "quickTerms",
            "terms",
            "용어",
            "용어 빠르게 이해하기",
            "핵심 용어",
        ],
        "discussion_prompt": [
            "discussion_prompt",
            "discussionPrompt",
            "prompt",
            "question",
            "토론질문",
            "토론 질문",
            "생각해볼질문",
            "생각해볼 질문",
        ],
    }

    normalized: dict[str, str] = {}
    for target, aliases in alias_groups.items():
        value = ""
        for alias in aliases:
            raw = data.get(alias)
            if isinstance(raw, str) and raw.strip():
                value = raw.strip()
                break
        normalized[target] = value

    if not normalized["why_it_matters"] and normalized["core_explanation"]:
        normalized["why_it_matters"] = "이 동향이 실제 모델 설계와 응용 방향에 어떤 영향을 주는지 추가 확인이 필요합니다."
    if not normalized["quick_terms"]:
        normalized["quick_terms"] = "- 핵심 용어: 원문 출처를 함께 확인하세요."
    if not normalized["discussion_prompt"] and normalized["title"]:
        normalized["discussion_prompt"] = f"{normalized['title']}가 실제 적용에 미칠 영향은 무엇일까?"
    return normalized


def validate_brief(data: dict[str, str]) -> None:
    required = ["title", "core_explanation", "why_it_matters", "quick_terms", "discussion_prompt"]
    for field in required:
        if not data.get(field):
            raise ValueError(f"Missing generated field: {field}")


def build_embed(brief: TrendBrief, track: str) -> discord.Embed:
    embed = discord.Embed(title=brief.title, color=discord.Color.green())
    embed.add_field(name="주제", value=brief.title, inline=False)
    embed.add_field(name="핵심 설명", value=brief.core_explanation, inline=False)
    embed.add_field(name="왜 중요한가", value=brief.why_it_matters, inline=False)
    embed.add_field(name="용어 빠르게 이해하기", value=brief.quick_terms, inline=False)
    embed.add_field(name="생각해볼 질문", value=brief.discussion_prompt, inline=False)
    embed.add_field(
        name="출처",
        value="\n".join(f"- {source['title']}: {source['url']}" for source in brief.sources),
        inline=False,
    )
    embed.add_field(name="주의", value=TREND_CAUTION_MESSAGE, inline=False)
    embed.set_footer(text=f"track={track} | mode=trend")
    return embed


def main() -> None:
    args = parse_args()
    history_path = Path(args.history_file)
    fetch_count = min(max(args.max_results + 3, args.max_results), 10)
    fetched_sources = fetch_trend_sources(track=args.track, max_results=fetch_count)
    history = load_history(history_path)
    try:
        sources = select_fresh_sources(
            track=args.track,
            fetched_sources=fetched_sources,
            history=history,
            max_results=args.max_results,
        )
    except NoFreshTrendSourcesError as exc:
        print(f"publish_status=skipped reason={exc}")
        return
    bootstrap_pythonpath()
    from core.config import get_settings

    settings = get_settings()
    prompt = build_prompt(args.track, sources)
    if args.dry_run:
        print(f"dry_run track={args.track} source_count={len(sources)}")
        return
    api_key = getattr(settings, "openai_api_key", "") or __import__("os").getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required.")
    if not settings.discord_webhook_url:
        raise RuntimeError("DISCORD_WEBHOOK_URL is required.")

    generated = normalize_generated_brief(generate_with_openai(prompt, api_key))
    validate_brief(generated)
    brief = TrendBrief(
        title=generated["title"],
        core_explanation=generated["core_explanation"],
        why_it_matters=generated["why_it_matters"],
        quick_terms=generated["quick_terms"],
        discussion_prompt=generated["discussion_prompt"],
        sources=sources,
    )
    embed = build_embed(brief, args.track)
    webhook = discord.SyncWebhook.from_url(settings.discord_webhook_url)
    message = webhook.send(content=f"오늘의 동향 브리핑 - {args.track}", embed=embed, wait=True)
    update_history(history_path, args.track, brief.title, sources)
    print(f"publish_status=success discord_message_id={message.id} track={args.track}")


if __name__ == "__main__":
    main()
