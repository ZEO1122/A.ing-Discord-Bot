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

    from core.db import create_all_tables

    create_all_tables()
    print("SQLite tables created.")


if __name__ == "__main__":
    main()
