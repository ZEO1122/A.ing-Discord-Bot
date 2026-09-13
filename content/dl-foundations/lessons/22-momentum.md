---
id: "dl-foundations-22"
title: "Momentum"
order: 22
version: 1
status: "draft"
objective: "Momentum이 과거 Gradient를 누적하는 방식과 현재 Gradient만 쓰는 업데이트의 차이를 설명할 수 있다."
prerequisites: ["dl-foundations-13", "dl-foundations-14"]
sources:
  - {"book": "d2l", "chapter": "12.6 Momentum", "url": "https://d2l.ai/chapter_optimization/momentum.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch06 · 학습 관련 기술", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch06"}
---

## 오늘의 핵심
- **Momentum**은 현재 Gradient뿐 아니라 과거 Gradient의 누적 방향도 업데이트에 반영합니다. 일관된 방향의 신호는 쌓고, 번갈아 흔들리는 방향은 일부 상쇄할 수 있습니다.
- 관성을 가진 움직임으로 생각할 수 있지만, 실제 계산은 이전 상태와 현재 Gradient를 결합하는 점화식입니다. 매 Step Gradient를 무시하고 계속 같은 방향으로 움직이는 것은 아닙니다.

## 왜 필요한가?
- Loss 표면이 좁고 길쭉한 골짜기 모양이면 기본 Gradient Descent는 한 방향으로 크게 흔들리며 진행할 수 있습니다. Mini-batch Gradient의 Noise도 방향을 흔듭니다.
- 과거 흐름을 반영하면 이런 변동을 완화하고 지속적인 방향으로 이동하는 데 도움이 될 수 있습니다. 효과는 Learning Rate와 Momentum 계수, 문제의 형태에 따라 달라집니다.

## 작동 원리
- **누적 상태를 둡니다.** 여기서는 `v_t = β × v_(t-1) + g_t`, `w_t = w_(t-1) - η × v_t`로 정의합니다. g는 현재 Gradient, β는 과거 상태를 남기는 비율, η는 Learning Rate입니다.
- **오래된 영향은 점차 줄어듭니다.** 과거 Gradient는 시간이 지날수록 β의 거듭제곱만큼 기여합니다. β가 1에 가까울수록 과거 영향이 오래갑니다.
- **정의 차이를 확인합니다.** 어떤 자료는 현재 Gradient에 1-β를 곱해 지수이동평균으로 표현합니다. 상태의 Scale이 달라지므로 수치 예제를 비교할 때 식을 먼저 맞춰야 합니다.

## 작은 예제로 확인하기
- 초기 누적 상태가 **0**, β가 **0.9**, 두 Step의 Gradient가 각각 **2, 2**이면 v는 **2**, 다음에는 **3.8**입니다.
- Learning Rate가 **0.1**이면 각 이동량은 **0.2**, **0.38**입니다. 같은 방향의 Gradient가 쌓여 두 번째 이동이 커집니다.
- 두 번째 Gradient가 대신 **-2**이면 v는 **-0.2**입니다. 갑자기 반대 Gradient가 나와도 과거 상태와 결합한 뒤 방향과 크기가 결정됩니다.

## 자주 하는 오해
- **Momentum이 항상 Loss 감소를 보장하지는 않습니다.** 관성 때문에 최솟값을 지나칠 수 있고, 큰 Learning Rate와 결합하면 불안정해질 수 있습니다.
- **Optimizer 상태도 학습 상태입니다.** Weight만 복원하고 누적 상태를 버리면 중단 전과 같은 업데이트가 이어지지 않을 수 있습니다.

## 복습 질문
- β를 **0**으로 두면 오늘 정의한 업데이트는 어떤 방법과 같아질까요?
- 현재 Gradient가 작아졌어도 Parameter가 꽤 크게 움직일 수 있는 이유를 Momentum 상태로 설명해 보세요.
