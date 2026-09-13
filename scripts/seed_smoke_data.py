from __future__ import annotations

# pyright: reportMissingImports=false

from pathlib import Path
import sys


def bootstrap_pythonpath() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "src"
    if str(src) not in sys.path:
        sys.path.insert(0, str(src))


def main() -> None:
    bootstrap_pythonpath()

    from core.db import create_all_tables, get_session
    from repositories.briefing_repository import BriefingRepository
    from repositories.quiz_repository import QuizRepository

    create_all_tables()
    session = get_session()
    try:
        briefing_repository = BriefingRepository(session)
        quiz_repository = QuizRepository(session)

        briefing = briefing_repository.ensure_sample_briefing(track="dl-basics")
        quiz = quiz_repository.ensure_sample_quiz(briefing)
        session.commit()

        print("Smoke data ready")
        print(f"briefing_id={briefing.id}")
        print(f"briefing_key={briefing.briefing_key}")
        print(f"quiz_id={quiz.id}")
        print(f"track={briefing.track}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
