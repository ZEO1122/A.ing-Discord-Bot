---
id: "dl-foundations-06"
title: "ReLU·Sigmoid·Tanh 비교"
order: 6
version: 1
status: "draft"
objective: "ReLU, Sigmoid, Tanh의 출력 범위와 Gradient 특성을 비교할 수 있다."
prerequisites: ["dl-foundations-05"]
sources:
  - {"book": "d2l", "chapter": "5.1 Multilayer Perceptrons", "url": "https://d2l.ai/chapter_multilayer-perceptrons/mlp.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch03 · 신경망", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch03"}
---

## 오늘의 핵심
- **ReLU**는 음수를 0으로 만들고 양수는 그대로 통과시킵니다. **Sigmoid**는 값을 0과 1 사이로, **Tanh**는 -1과 1 사이로 압축합니다.
- 선택할 때는 출력 범위뿐 아니라 **Gradient가 얼마나 전달되는지**도 봐야 합니다. 비슷한 출력 값을 만들더라도 학습 과정에 미치는 영향은 다릅니다.

## 왜 필요한가?
- Backpropagation에서는 Activation의 미분도 Gradient에 연결됩니다. 미분이 매우 작은 구간을 반복해서 지나면 앞쪽 Layer로 전달되는 학습 신호가 약해질 수 있습니다.
- Hidden Layer, 확률 출력, Gate는 요구하는 성질이 다릅니다. 함수 하나를 무조건 좋은 것으로 정하기보다 어느 위치에서 어떤 역할을 맡는지 확인해야 합니다.

## 작동 원리
- **ReLU:** 양수 구간의 미분은 1, 음수 구간은 0입니다. 양수 구간에서는 Saturation이 없지만 어떤 Unit이 계속 음수만 받으면 Gradient가 막힐 수 있습니다.
- **Sigmoid:** 입력이 큰 양수나 음수이면 출력이 각각 1이나 0에 가까워지고 미분은 작아집니다. 이처럼 출력이 끝값에 가까워져 둔감해지는 현상을 Saturation이라고 합니다.
- **Tanh:** 출력이 양수와 음수를 모두 갖고 원점 중심입니다. 다만 양 끝에서는 Sigmoid처럼 Saturation이 생깁니다. 출력 중심이 0이라고 Gradient 문제가 사라지는 것은 아닙니다.

## 작은 예제로 확인하기
- 입력 **-2, 0, 2**에 대한 ReLU 출력은 **0, 0, 2**입니다. 음수 정보는 그대로 보존되지 않고 0으로 바뀝니다.
- Sigmoid 출력은 대략 **0.119, 0.5, 0.881**, Tanh 출력은 대략 **-0.964, 0, 0.964**입니다. 세 함수가 같은 입력을 서로 다른 범위로 표현합니다.
- Sigmoid는 입력 0에서 미분이 **0.25**로 가장 큽니다. 작은 미분들이 여러 Layer에 걸쳐 곱해질 수 있다는 점이 깊은 구조에서 중요한 고려 사항입니다.

## 자주 하는 오해
- **ReLU의 0 지점에서는 일반적인 미분이 정의되지 않습니다.** 구현에서는 사용할 값을 정해 처리하며, 이것과 음수 구간의 Gradient 0은 구분해야 합니다.
- **Sigmoid 출력이라고 자동으로 믿을 만한 확률은 아닙니다.** 0~1 범위를 갖는 것과 예측 확률이 실제 빈도에 잘 맞는 것은 별개의 성질입니다.

## 복습 질문
- 큰 양수 입력에서 ReLU와 Sigmoid의 미분은 어떻게 다를까요?
- Hidden Unit이 모든 학습 샘플에 대해 음수 입력을 받는다면 ReLU의 학습에 어떤 문제가 생길 수 있을까요?
