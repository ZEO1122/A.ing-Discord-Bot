"""Execute only the three explicitly reviewed Python examples; never run at publish time."""
import math
import os
from pathlib import Path
import re
import subprocess
import sys

LESSONS = {
    "01-tensors-and-shapes.md": "shape",
    "12-backpropagation.md": "gradient",
    "27-training-debugging.md": "training",
}
for filename, kind in LESSONS.items():
    path = Path("content/dl-foundations/lessons") / filename
    blocks = re.findall(r"```python\n(.*?)\n```", path.read_text(), re.S)
    assert len(blocks) == 1, filename
    completed = subprocess.run(
        [sys.executable, "-c", blocks[0]],
        capture_output=True, text=True, timeout=15,
        env={key: value for key, value in os.environ.items() if key in {"PATH", "LANG", "SYSTEMROOT"}},
    )
    assert completed.returncode == 0, f"{filename}: example execution failed (NumPy required)"
    lines = completed.stdout.strip().splitlines()
    if kind == "shape":
        assert lines[0] == "(2, 3) 6"
        assert [int(n) for n in re.findall(r"\d+", lines[1])] == [3, 7, 11]
        assert [int(n) for n in re.findall(r"\d+", lines[2])] == [12, 9]
    elif kind == "gradient":
        assert math.isclose(float(lines[0]), -1.0, abs_tol=1e-7)
        assert math.isclose(float(lines[1]), -6.0, abs_tol=1e-7)
    else:
        assert lines == ["2.0 True"]
    print(f"PASS {filename}")
