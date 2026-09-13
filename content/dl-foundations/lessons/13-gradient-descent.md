---
id: "dl-foundations-13"
title: "Gradient Descent와 Learning Rate"
order: 13
version: 1
status: "draft"
objective: "Gradient Descent의 업데이트 방향과 Learning Rate에 따른 동작 차이를 설명할 수 있다."
prerequisites: ["dl-foundations-10", "dl-foundations-12"]
sources:
  - {"book": "d2l", "chapter": "12.3 Gradient Descent", "url": "https://d2l.ai/chapter_optimization/gd.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch04 · 신경망 학습", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch04"}
---

## 오늘의 핵심
- **Gradient Descent**는 현재 Gradient의 반대 방향으로 Parameter를 이동시키는 방법입니다. 한 변수라면 `새 w = 현재 w - Learning Rate × Gradient`로 표현합니다.
- **Learning Rate**는 한 번에 얼마나 이동할지 조절합니다. 방향이 맞아도 보폭이 너무 크면 낮은 Loss 지점을 지나쳐 오히려 Loss가 커질 수 있습니다.

## 왜 필요한가?
- Gradient는 변화율을 알려주지만 실제 이동 거리를 정해 주지는 않습니다. 적절한 Learning Rate가 있어야 국소적인 정보로 Parameter를 점진적으로 개선할 수 있습니다.
- 학습이 느리다고 Model을 먼저 키우기보다 업데이트 크기가 너무 작은지 확인해야 합니다. 반대로 Loss가 심하게 요동치면 큰 Learning Rate가 원인 중 하나일 수 있습니다.

## 작동 원리
- **현재 지점에서 Gradient를 계산합니다.** Parameter가 움직이면 같은 데이터에서도 Gradient가 달라질 수 있으므로 업데이트마다 다시 계산합니다.
- **여러 Parameter는 같은 계산 시점의 Gradient로 갱신합니다.** 일부 Weight를 먼저 바꾼 뒤 나머지 Gradient를 섞으면 의도한 동시 업데이트와 달라집니다.
- **Loss 감소를 관찰합니다.** 적절한 보폭은 함수의 곡률과 Gradient Scale에 따라 달라집니다. 딥러닝의 복잡한 Loss에서 모든 업데이트가 항상 감소하거나 전역 최솟값에 도달한다고 보장하지는 않습니다.

## 작은 예제로 확인하기
- `L(w)=w²`에서 w가 **2**이면 Gradient는 **4**입니다. Learning Rate가 **0.1**이면 새 w는 **1.6**, Loss는 **4에서 2.56**으로 줄어듭니다.
- Learning Rate가 **1**이면 w는 **-2**가 되고 다음에는 다시 **2**가 됩니다. 이 예제에서는 최솟값 주변을 오가며 Loss가 줄지 않습니다.
- Learning Rate가 **1.1**이면 첫 w는 **-2.4**, Loss는 **5.76**이 됩니다. 방향은 Gradient의 반대였지만 보폭이 커서 결과가 나빠졌습니다.

## 자주 하는 오해
- **Learning Rate는 작을수록 무조건 좋은 값이 아닙니다.** 너무 작으면 제한된 학습 시간 안에 충분히 이동하지 못합니다.
- **Gradient의 음수 부호를 다시 뒤집지 마세요.** 업데이트 식 자체가 Gradient를 빼므로 Gradient가 음수일 때는 Parameter가 증가합니다.

## 복습 질문
- 현재 Weight가 **3**, Gradient가 **-2**, Learning Rate가 **0.05**라면 업데이트 후 Weight는 얼마일까요?
- Loss가 줄지 않을 때 Learning Rate 외에 확인해야 할 조건을 하나 설명해 보세요.
