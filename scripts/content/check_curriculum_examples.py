# coding: utf-8
"""Internal checks for worked lesson examples, not public quiz solutions.

Constants must be compared with Markdown during editorial review; these checks
verify the calculations, not the correctness of every sentence or source.
"""

import math
from typing import Any

import numpy as np

checks = 0


def check(name: str, actual: Any, expected: Any, tol: float = 1e-8) -> None:
    global checks
    assert np.allclose(actual, expected, atol=tol, rtol=0), name
    checks += 1
    print("PASS", name)


check("02 dot product", np.dot([1, 2, 3], [2, 0, -1]), -1)
check("03 forward variants", [2 * 3 + 1, 2 * 4 + 1, 1.5 * 3 + 1], [7, 9, 5.5])
check(
    "04 affine and parameter count", [np.dot([2, 3], [4, -1]) + 5, 3 * 2 + 2], [10, 8]
)
check("05 nonlinear branches", [3 * max(0, 2 * x + 1) + 4 for x in [-1, 1]], [4, 13])
check("06 activations", [1 / (1 + math.exp(2)), math.tanh(2)], [0.119, 0.964], 0.0005)
check("07 mse", np.mean((np.array([3, 2]) - np.array([2, 4])) ** 2), 2.5)
z = np.array([2.0, 1.0, 0.0])
p = np.exp(z - z.max())
p /= p.sum()
check("08 softmax", p, [0.665, 0.245, 0.090], 0.0005)
check(
    "09 cross entropy",
    [-math.log(p) for p in [0.8, 0.2, 0.6, 0.9]],
    [0.223, 1.609, 0.511, 0.105],
    0.0005,
)
eps = 1e-5


def quadratic_loss(a: float, b: float) -> float:
    return a * a + 3 * b * b


check(
    "10 finite differences",
    [
        (quadratic_loss(1 + eps, 2) - quadratic_loss(1 - eps, 2)) / (2 * eps),
        (quadratic_loss(1, 2 + eps) - quadratic_loss(1, 2 - eps)) / (2 * eps),
    ],
    [2, 12],
)


def composed_loss(x: float) -> float:
    return (2 * x + 1) ** 2


check(
    "11 chain rule finite difference",
    (composed_loss(3 + eps) - composed_loss(3 - eps)) / (2 * eps),
    28,
)
check(
    "13 gradient descent loss",
    [(2 - eta * 4) ** 2 for eta in [0.1, 1, 1.1]],
    [2.56, 4, 5.76],
)
check(
    "14 batch steps",
    [
        math.ceil(1000 / 100),
        12 * math.ceil(1000 / 100),
        math.ceil(1000 / 250),
        1030 % 100,
    ],
    [10, 120, 4, 30],
)
check("15 accumulation", 2 + 3, 5)
check("17 best validation epoch", [1, 5, 10][np.argmin([1, 0.5, 0.8])], 5)
tp, fp, fn, tn = 12, 3, 8, 77
check(
    "18 metrics",
    [tp / (tp + fp), tp / (tp + fn), (tp + tn) / 100, 2 * tp / (2 * tp + fp + fn)],
    [0.8, 0.6, 0.89, 24 / 35],
)
check("19 regularization", [2 - 0.05 * 0.1 * 2, 0.1 / 2 * (3**2 + 4**2)], [1.99, 1.25])
check("20 dropout expectation", 0.5 * 0 + 0.5 * (6 / 0.5), 6)
check(
    "21 best checkpoint", [0.6, 0.5, 0.52, 0.55][np.argmin([0.6, 0.5, 0.52, 0.55])], 0.5
)
check("22 momentum", [0.9 * 0 + 2, 0.9 * 2 + 2, 0.9 * 2 - 2], [2, 3.8, -0.2])
check(
    "23 optimizer moments",
    [2 / math.sqrt(8), 0.2 / (1 - 0.9), 0.004 / (1 - 0.999)],
    [1 / math.sqrt(2), 2, 4],
)
check("24 warmup", [0.1 * t / 4 for t in range(1, 5)], [0.025, 0.05, 0.075, 0.1])
check(
    "25 he standard deviation",
    [math.sqrt(2 / 100), math.sqrt(2 / 400)],
    [0.141, 0.071],
    0.0005,
)
x = np.array([[1, 3], [5, 7]])
check("26 normalization means", [x.mean(axis=0), x.mean(axis=1)], [[3, 5], [2, 6]])
check(
    "28 convolution count and correlation",
    [3 * 3 * 3 * 8 + 8, 1 - 2, 2 - 4],
    [224, -1, -2],
)
check(
    "29 output size and pooling",
    [math.floor((5 + 2 - 3) / 2) + 1, max([1, 4, 2, 3]), np.mean([1, 4, 2, 3])],
    [3, 4, 2.5],
)
check("30 residual", np.array([2, -1]) + np.array([0.5, 0.2]), [2.5, -0.8])


def recurrent(xs: list[float]) -> list[float]:
    h = 0.0
    hs = []
    for x in xs:
        h = 0.5 * h + x
        hs.append(h)
    return hs


check(
    "31 rnn states",
    [recurrent([2, 0, 1]), recurrent([1, 0, 2])],
    [[2, 1, 1.5], [1, 0.5, 2.25]],
)
check("32 temporal gradient", [0.5**10, 2**10], [0.0009765625, 1024])
check("33 cell state", 0.9 * 2 + 0.2 * 0.5, 1.9)
v = np.array([[2, 0], [0, 4]])
check(
    "34 attention mixing",
    [np.array([0.5, 0.5]) @ v, np.array([0.75, 0.25]) @ v],
    [[1, 2], [1.5, 1]],
)
check("35 heads and pairs", [128 / 4, 10**2, 20**2], [32, 100, 400])
print("Verified arithmetic groups:", checks)
