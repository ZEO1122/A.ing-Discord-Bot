---
id: "dl-foundations-25"
title: "Vanishing·Exploding Gradient와 Initialization"
order: 25
version: 1
status: "draft"
objective: "Gradient가 사라지거나 커지는 원인과 Initialization이 이를 완화하는 방식을 설명할 수 있다."
prerequisites: ["dl-foundations-06", "dl-foundations-12"]
sources:
  - {"book": "d2l", "chapter": "5.4 Numerical Stability and Initialization", "url": "https://d2l.ai/chapter_multilayer-perceptrons/numerical-stability-and-init.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch06 · 학습 관련 기술", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch06"}
---

## 오늘의 핵심
- **Vanishing Gradient**는 앞쪽으로 전달되는 Gradient가 매우 작아지는 현상이고, **Exploding Gradient**는 지나치게 커지는 현상입니다.
- **Initialization**은 학습 시작 시 Weight를 어떻게 정할지 결정합니다. 서로 다른 Unit의 대칭성을 깨고, Forward의 활성값과 Backward의 Gradient Scale이 심하게 무너지지 않도록 돕습니다.

## 왜 필요한가?
- Backpropagation에서는 여러 Layer의 미분이 연쇄적으로 연결됩니다. 각 단계가 신호를 조금씩 줄이거나 늘리는 효과도 깊이가 커지면 누적될 수 있습니다.
- 첫 Layer가 거의 학습되지 않거나 Loss가 NaN이 되는 경우에는 Learning Rate뿐 아니라 Activation, 초기 Weight Scale, Gradient 크기를 함께 점검해야 합니다.

## 작동 원리
- **연쇄 곱의 효과를 봅니다.** 단순한 Scalar 경로에서 미분 0.5가 10번 곱해지면 약 0.001, 2가 10번 곱해지면 1,024가 됩니다. 실제 신경망은 행렬과 여러 경로를 포함하지만 누적 효과의 직관은 같습니다.
- **Weight Scale을 Layer 크기에 맞춥니다.** Xavier Initialization은 입력·출력 연결 수를 고려하고, He Initialization은 ReLU 계열을 고려해 입력 연결 수에 맞춘 분산을 사용합니다.
- **완벽한 대칭을 피합니다.** 같은 구조의 Hidden Unit을 같은 값으로 초기화하면 같은 계산과 업데이트를 반복할 수 있습니다. 무작위 초기화는 Unit이 다른 표현을 배울 출발점을 제공합니다.

## 작은 예제로 확인하기
- ReLU Layer에서 입력 연결 수가 **100**이면 대표적인 He 정규 초기화의 Weight 분산은 **2/100 = 0.02**, 표준편차는 약 **0.141**입니다.
- 입력 연결 수가 **400**이면 표준편차는 약 **0.071**로 작아집니다. 합쳐지는 입력이 늘어날 때 같은 Scale을 무작정 유지하지 않는 것입니다.
- 이는 입력과 Weight의 분포에 관한 가정을 사용하는 초기 설계입니다. 실제 학습에서는 Layer별 활성값과 Gradient도 확인해야 합니다.

## 자주 하는 오해
- **모든 Parameter를 0으로 시작해야 공정한 비교가 되는 것은 아닙니다.** Hidden Weight의 대칭성이 학습을 제한할 수 있습니다. Bias를 0으로 두는 것과 모든 Weight를 0으로 두는 것은 구분하세요.
- **Gradient Clipping은 Vanishing Gradient의 해결책이 아닙니다.** 너무 큰 Gradient를 제한하는 방법이며 작아진 학습 신호를 복원하지는 않습니다.

## 복습 질문
- 같은 입력을 받는 Hidden Unit들의 Weight와 Bias가 모두 같다면, 어떤 점에서 서로 다른 Feature를 배우기 어려울까요?
- 앞 Layer의 Gradient가 거의 0일 때 Learning Rate만 크게 하는 것 외에 무엇을 살펴봐야 할까요?
