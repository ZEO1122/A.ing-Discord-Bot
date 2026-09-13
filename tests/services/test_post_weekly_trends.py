from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from scripts.post_weekly_trends import (
    DISCORD_EMBED_FIELD_VALUE_LIMIT,
    DISCORD_CORE_FIELD_LIMIT,
    DISCORD_REASON_FIELD_LIMIT,
    DISCORD_SOURCE_FIELD_LIMIT,
    DISCORD_TERMS_FIELD_LIMIT,
    DISCORD_TOPIC_FIELD_LIMIT,
    InterestSection,
    build_channel_embed,
    format_source_value,
    history_key,
    load_channel_map,
    load_webhook_map,
    safe_truncate_text,
)
from scripts.post_trend_brief import NoFreshTrendSourcesError, TrendBrief


def test_history_key_uses_channel_and_interest() -> None:
    assert history_key("123", "nlp") == "123:nlp"


def test_load_channel_map_parses_channels(tmp_path: Path) -> None:
    config_path = tmp_path / "channel_interest_map.json"
    config_path.write_text(
        json.dumps(
            {
                "channels": [
                    {
                        "channel_key": "default-channel",
                        "channel_id": "123",
                        "webhook_key": "default",
                        "enabled": True,
                        "interests": ["nlp", "llm"],
                        "max_topics": 2,
                    }
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    channels = load_channel_map(config_path)
    assert len(channels) == 1
    assert channels[0].channel_key == "default-channel"
    assert channels[0].interests == ["nlp", "llm"]


def test_build_channel_embed_bundles_interest_sections() -> None:
    config_path = Path("/tmp/channel_interest_map_test.json")
    config_path.write_text(
        json.dumps(
            {
                "channels": [
                    {
                        "channel_key": "default-channel",
                        "channel_id": "123",
                        "webhook_key": "default",
                        "enabled": True,
                        "interests": ["nlp"],
                        "max_topics": 1,
                    }
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    channel = load_channel_map(config_path)[0]
    sections = [
        InterestSection(
            interest="nlp",
            brief=TrendBrief(
                title="NLP 동향",
                core_explanation="최근 논문이 증가했다.",
                why_it_matters="응용이 늘어난다.",
                quick_terms="- 추론: 모델이 답을 도출하는 과정",
                discussion_prompt="이번 주 핵심은?",
                sources=[{"title": "Paper", "url": "https://arxiv.org/abs/1234.5678"}],
            ),
        )
    ]
    embed = build_channel_embed(channel, sections)
    assert "이번 주 관심분야 브리핑" in (embed.title or "")
    assert embed.fields[0].name == "주제"
    assert embed.fields[1].name == "핵심 설명"
    assert embed.fields[2].name == "왜 중요한가"
    assert embed.fields[3].name == "용어 빠르게 이해하기"
    assert embed.fields[4].name == "생각해볼 질문"
    assert embed.fields[5].name == "출처"
    assert embed.fields[-1].name == "주의"


def test_load_webhook_map_uses_fallback(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.delenv("DISCORD_WEBHOOK_MAP_JSON", raising=False)
    monkeypatch.setenv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/test")
    assert load_webhook_map() == {"default": "https://discord.com/api/webhooks/test"}


def test_load_webhook_map_accepts_yaml_style_secret(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setenv(
        "DISCORD_WEBHOOK_MAP_JSON",
        "default: https://discord.com/api/webhooks/test\nnlp-study: https://discord.com/api/webhooks/test2\n",
    )
    assert load_webhook_map() == {
        "default": "https://discord.com/api/webhooks/test",
        "nlp-study": "https://discord.com/api/webhooks/test2",
    }


def test_load_channel_map_preserves_disabled_channels(tmp_path: Path) -> None:
    config_path = tmp_path / "channel_interest_map.json"
    config_path.write_text(
        json.dumps(
            {
                "channels": [
                    {
                        "channel_key": "llm-brief",
                        "channel_id": "123",
                        "webhook_key": "llm-brief",
                        "enabled": False,
                        "interests": ["llm"],
                        "max_topics": 1,
                    }
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    channels = load_channel_map(config_path)
    assert len(channels) == 1
    assert channels[0].enabled is False


def test_no_fresh_error_message_shape() -> None:
    error = NoFreshTrendSourcesError("No fresh trend sources available for track=llm")
    assert "No fresh trend sources available" in str(error)


def test_safe_truncate_text_respects_limit() -> None:
    value = safe_truncate_text("긴 설명 " * 100, DISCORD_CORE_FIELD_LIMIT)
    assert len(value) <= DISCORD_CORE_FIELD_LIMIT


def test_format_source_value_truncates_to_source_limit() -> None:
    value = format_source_value(["- Source A: https://example.com/very/long/url" * 10])
    assert len(value) <= DISCORD_SOURCE_FIELD_LIMIT


def test_safe_truncate_text_prefers_sentence_boundary() -> None:
    text = "첫 문장이다. 둘째 문장도 있다. 셋째 문장도 충분히 길다."
    truncated = safe_truncate_text(text, 20)
    assert len(truncated) <= 20
    assert truncated.startswith("첫 문장이다")


def test_build_channel_embed_keeps_field_values_within_limit() -> None:
    config_path = Path("/tmp/channel_interest_map_long_test.json")
    config_path.write_text(
        json.dumps(
            {
                "channels": [
                    {
                        "channel_key": "llm-brief",
                        "channel_id": "123",
                        "webhook_key": "llm-brief",
                        "enabled": True,
                        "interests": ["llm"],
                        "max_topics": 1,
                    }
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    channel = load_channel_map(config_path)[0]
    sections = [
        InterestSection(
            interest="llm",
            brief=TrendBrief(
                title="긴 제목 " * 30,
                core_explanation="긴 핵심 설명 " * 100,
                why_it_matters="긴 중요성 설명 " * 120,
                quick_terms="- 용어A: 설명 " * 20,
                discussion_prompt="토론 질문",
                sources=[
                    {"title": "Very Long Paper Title " * 10, "url": "https://example.com/very/long/url" * 3},
                    {"title": "Another Long Paper Title " * 10, "url": "https://example.com/another/long/url" * 3},
                ],
            ),
        )
    ]
    embed = build_channel_embed(channel, sections)
    assert len(cast(str, embed.fields[0].value)) <= DISCORD_TOPIC_FIELD_LIMIT
    assert len(cast(str, embed.fields[1].value)) <= DISCORD_CORE_FIELD_LIMIT
    assert len(cast(str, embed.fields[2].value)) <= DISCORD_REASON_FIELD_LIMIT
    assert len(cast(str, embed.fields[3].value)) <= DISCORD_TERMS_FIELD_LIMIT
    assert len(cast(str, embed.fields[4].value)) <= 120
    assert len(cast(str, embed.fields[5].value)) <= DISCORD_SOURCE_FIELD_LIMIT
    for field in embed.fields:
        assert len(cast(str, field.value)) <= DISCORD_EMBED_FIELD_VALUE_LIMIT
