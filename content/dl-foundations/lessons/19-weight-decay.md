---
id: "dl-foundations-19"
title: "L2 Regularization과 Weight Decay"
order: 19
version: 1
status: "draft"
objective: "L2 항의 Gradient와 기본 SGD의 Weight Decay 관계를 설명할 수 있다."
prerequisites: ["dl-foundations-13", "dl-foundations-17"]
sources:
  - {"book": "d2l", "chapter": "3.7 Weight Decay", "url": "https://d2l.ai/chapter_linear-regression/weight-decay.html"}
  - {"book": "deep-learning", "chapter": "7 Regularization for Deep Learning", "url": "https://www.deeplearningbook.org/contents/regularization.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch06 · 학습 관련 기술", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch06"}
---

## 오늘의 핵심
- **L2 Regularization**은 예측 Loss에 Weight 제곱합에 비례하는 항을 더합니다. 데이터에 맞추는 것과 Weight 크기를 제한하는 것을 함께 최적화합니다.
- 기본 SGD에서는 이 항의 효과를 매 Step Weight를 조금 줄이는 **Weight Decay**로 표현할 수 있습니다. 하지만 이 등가 관계를 모든 Optimizer에 그대로 적용하면 안 됩니다.

## 왜 필요한가?
- Training 데이터에 지나치게 민감한 큰 Weight를 억제하면 새로운 데이터의 성능에 도움이 될 수 있습니다. 단, Weight가 작다는 사실만으로 좋은 Generalization이 보장되지는 않습니다.
- Regularization 강도가 너무 크면 데이터의 관계까지 충분히 학습하지 못할 수 있습니다. Training Loss만 낮추는 방향과는 목적이 다르므로 Validation으로 강도를 비교합니다.

## 작동 원리
- **목적함수를 정합니다.** 여기서는 `전체 Loss = 데이터 Loss + (λ/2) × Σw²`로 둡니다. λ가 제약의 강도이고, 추가 항의 Gradient는 각 Weight에 대해 `λw`입니다.
- **기본 SGD 식으로 풀어봅니다.** Learning Rate가 η, 데이터 Gradient가 g이면 새 Weight는 `w - η(g + λw) = (1 - ηλ)w - ηg`입니다. 같은 계수 정의에서 축소 항이 분리됩니다.
- **Optimizer에 따라 구분합니다.** Adam처럼 Gradient를 좌표별로 재조정하면 L2 항도 그 재조정에 섞입니다. Gradient 처리와 Weight 축소를 분리하는 방식과 일반적으로 동일하지 않습니다.

## 작은 예제로 확인하기
- Weight가 **2**, 데이터 Gradient가 **0**, λ가 **0.1**, Learning Rate가 **0.05**라면 새 Weight는 **1.99**입니다. 데이터 Gradient가 없어도 축소 항이 작동합니다.
- Weight가 `[3, 4]`이면 제곱합은 **25**입니다. λ가 **0.1**일 때 우리가 정한 추가 Loss는 **1.25**입니다.
- 다른 자료가 앞의 1/2를 생략했다면 Gradient의 계수도 달라집니다. 이름이 같다는 이유만으로 숫자 λ를 그대로 비교하면 안 됩니다.

## 자주 하는 오해
- **Weight Decay는 Weight를 매번 같은 상수만큼 빼는 것이 아닙니다.** 기본 형태에서는 현재 Weight 크기에 비례해 줄어들며, 음수 Weight도 0 쪽으로 이동합니다.
- **모든 Parameter를 반드시 똑같이 규제하지는 않습니다.** Bias나 Normalization Parameter를 제외하는 설정도 있으므로 실제 적용 대상을 확인해야 합니다.

## 복습 질문
- 데이터 Gradient가 0이고 Weight가 **-2**라면 같은 설정의 축소 항은 어느 방향으로 작용할까요?
- L2 항을 더한 Adam과 Gradient 처리 밖에서 Weight를 줄이는 방식이 달라질 수 있는 이유는 무엇일까요?
