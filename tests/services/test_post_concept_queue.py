from __future__ import annotations

import json
from pathlib import Path

from scripts.post_concept_queue import select_next_brief_path, update_progress
from scripts.post_concept_brief import ParsedBrief


def test_select_next_brief_path_returns_first_item_when_progress_empty() -> None:
    manifest = {"order": ["a.md", "b.md"]}
    progress = {"last_index": -1}
    result = select_next_brief_path(manifest, progress)
    assert result == (0, "a.md")


def test_select_next_brief_path_returns_none_when_queue_finished() -> None:
    manifest = {"order": ["a.md"]}
    progress = {"last_index": 0}
    assert select_next_brief_path(manifest, progress) is None


def test_update_progress_writes_expected_fields(tmp_path: Path) -> None:
    progress_path = tmp_path / "progress.json"
    brief = ParsedBrief(
        briefing_key="dl-basics-attention-001",
        track="dl-basics",
        title="어텐션은 왜 중요한가",
        one_line="요약",
        discussion_prompt="질문",
        what_happened="설명",
        why_it_matters="중요성",
        easy_terms=["Attention: ..."],
        sources=[{"title": "paper", "url": "https://arxiv.org/abs/1706.03762"}],
    )
    update_progress(progress_path, 0, "content/concepts/dl-basics/attention.md", brief)
    data = json.loads(progress_path.read_text(encoding="utf-8"))
    assert data["last_index"] == 0
    assert data["last_path"] == "content/concepts/dl-basics/attention.md"
    assert data["last_briefing_key"] == "dl-basics-attention-001"
