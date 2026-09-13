from __future__ import annotations

from pathlib import Path

from scripts.post_concept_brief import build_full_embed, load_markdown_body, parse_body_sections, parse_brief


def test_parse_brief_supports_generated_concept_format(tmp_path: Path) -> None:
    brief_path = tmp_path / "generated.md"
    brief_path.write_text(
        """---
briefing_key: generated-001
track: dl-basics
mode: concept
title: 퍼셉트론
one_line: 퍼셉트론은 가장 기본적인 이진 분류 모델이다.
discussion_prompt: 왜 아직도 퍼셉트론을 배우는가?
---

## 핵심 설명
- 퍼셉트론은 입력의 가중합을 기준으로 출력을 결정한다.

## 직관
- 총점이 기준 이상이면 통과라고 판단하는 방식과 비슷하다.

## 헷갈리기 쉬운 점
- 단일 퍼셉트론은 모든 문제를 풀 수 없다.

## source
- Rosenblatt / The Perceptron / 1958
""",
        encoding="utf-8",
    )

    brief = parse_brief(brief_path)

    assert brief.briefing_key == "generated-001"
    assert brief.what_happened.startswith("- 퍼셉트론")
    assert "총점이 기준 이상" in brief.why_it_matters
    assert brief.sources[0]["title"] == "Rosenblatt / The Perceptron / 1958"


def test_parse_brief_supports_current_concept_heading_variants(tmp_path: Path) -> None:
    brief_path = tmp_path / "current-format.md"
    brief_path.write_text(
        """---
briefing_key: generated-002
track: dl-basics
mode: concept
title: 순전파
one_line: 순전파는 입력이 예측값으로 변환되는 계산 과정이다.
discussion_prompt: 왜 순전파를 먼저 이해해야 할까?
---

## 오늘의 개념
- 순전파는 입력이 네트워크를 통과하는 계산 과정이다.

## 핵심 요약
- 입력이 층을 거치며 예측값으로 바뀐다.

## 왜 중요한가
- 손실 함수는 순전파 결과를 바탕으로 계산된다.

## 용어 빠르게 이해하기
- 활성값: 층 사이에서 전달되는 중간 출력

## source
- Deep Learning / 2016
""",
        encoding="utf-8",
    )

    brief = parse_brief(brief_path)

    assert brief.briefing_key == "generated-002"
    assert "예측값" in brief.what_happened
    assert "손실 함수" in brief.why_it_matters
    assert brief.easy_terms == ["활성값: 층 사이에서 전달되는 중간 출력"]
    assert brief.sources[0]["title"] == "Deep Learning / 2016"


def test_parse_brief_can_fallback_to_today_concept_heading(tmp_path: Path) -> None:
    brief_path = tmp_path / "today-concept-only.md"
    brief_path.write_text(
        """---
briefing_key: generated-003
track: dl-basics
mode: concept
title: 테스트 개념
one_line: 테스트용 요약.
---

## 오늘의 개념
- 이 섹션만 있어도 최소 설명을 추출할 수 있어야 한다.

## 왜 중요한가
- 이유는 명확해야 한다.

## source
- Test Source
""",
        encoding="utf-8",
    )

    brief = parse_brief(brief_path)

    assert "최소 설명" in brief.what_happened
    assert "이유는 명확" in brief.why_it_matters


def test_load_markdown_body_excludes_frontmatter(tmp_path: Path) -> None:
    brief_path = tmp_path / "body-only.md"
    brief_path.write_text(
        """---
briefing_key: sample-1
track: dl-basics
mode: concept
title: 샘플
one_line: 샘플 요약
---

## 오늘의 개념
- 본문만 남아야 한다.
""",
        encoding="utf-8",
    )

    body = load_markdown_body(brief_path)
    assert body.startswith("## 오늘의 개념")
    assert "briefing_key" not in body


def test_parse_body_sections_preserves_section_order() -> None:
    body = """## 오늘의 개념
- A

## 핵심 요약
- B

## 왜 중요한가
- C
"""
    sections = parse_body_sections(body)
    assert sections[0][0] == "오늘의 개념"
    assert sections[1][0] == "핵심 요약"
    assert sections[2][0] == "왜 중요한가"


def test_build_full_embed_adds_all_markdown_sections() -> None:
    brief = parse_brief(Path("content/concepts/dl-basics/dl-concept-001-perceptron.md"))
    body = load_markdown_body(Path("content/concepts/dl-basics/dl-concept-001-perceptron.md"))
    embed = build_full_embed(brief, body)
    field_names = [field.name for field in embed.fields]
    assert embed.title == "퍼셉트론"
    assert embed.description == brief.one_line
    assert "정의" in field_names
    assert "핵심 정리" in field_names
    assert "왜 중요한가" in field_names
    assert "공부 포인트" in field_names
    assert "직관" in field_names
    assert "예시" in field_names
    assert "용어 빠르게 이해하기" in field_names
    assert "헷갈리기 쉬운 점" in field_names
    assert "셀프 체크" in field_names
    assert "토론 거리" in field_names
    assert "출처" in field_names
    assert "주의" in field_names
