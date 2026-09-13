"""Internal arithmetic checks for lesson examples; code is not published to Discord."""
import math
import os
import re
import subprocess
import sys

LESSONS = {
    "01-tensors-and-shapes.md": "shape",
    "12-backpropagation.md": "gradient",
    "27-training-debugging.md": "training",
}
EXAMPLES = {'01-tensors-and-shapes.md': 'import numpy as np\nx = np.array([[2, 4, 6], [1, 3, 5]])\nprint(x.shape, x.size)      # (2, 3) 6\nprint(x.sum(axis=0))        # [3 7 11]\nprint(x.sum(axis=1))        # [12 9]', '12-backpropagation.md': 'def loss(w1, w2):\n    prediction = w2 * max(0.0, w1 * 2.0)\n    return (prediction - 4.0) ** 2 / 2\n\neps = 1e-5\nprint((loss(3+eps, .5)-loss(3-eps, .5))/(2*eps))\nprint((loss(3, .5+eps)-loss(3, .5-eps))/(2*eps))\n# 약 -1.0, -6.0', '27-training-debugging.md': 'xs, ys = [1.0, 2.0], [2.0, 4.0]\nw = 0.0\nfor _ in range(30):\n    grad = sum((w*x-y)*x for x, y in zip(xs, ys))/2\n    w -= 0.1 * grad\nfinal_loss = sum((w*x-y)**2 for x, y in zip(xs, ys))/4\nprint(round(w, 3), final_loss < 1e-6)\n# 2.0 True'}

for filename, kind in LESSONS.items():
    blocks = [EXAMPLES[filename]]
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
