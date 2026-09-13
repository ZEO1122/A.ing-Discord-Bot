---
id: "dl-foundations-11"
title: "Chain Rule과 Computational Graph"
order: 11
version: 1
status: "draft"
objective: "Computational Graph에서 Chain Rule을 적용하고 여러 경로의 Gradient를 합산할 수 있다."
prerequisites: ["dl-foundations-10"]
sources:
  - {"book": "d2l", "chapter": "2.4 Calculus", "url": "https://d2l.ai/chapter_preliminaries/calculus.html"}
  - {"book": "d2l", "chapter": "5.3 Forward Propagation, Backward Propagation, and Computational Graphs", "url": "https://d2l.ai/chapter_multilayer-perceptrons/backprop.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch05 · Backpropagation", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch05"}
---

## 오늘의 핵심
- **Chain Rule**은 여러 함수를 거쳐 연결된 변화율을 계산하는 규칙입니다. 바깥 함수의 변화율과 안쪽 함수의 변화율을 연결합니다.
- **Computational Graph**는 계산을 작은 연산과 연결로 나눈 표현입니다. 각 연산의 미분을 알고 있으면 복잡한 전체 식도 단계별로 추적할 수 있습니다.

## 왜 필요한가?
- 신경망은 행렬 곱, 덧셈, Activation, Loss 같은 연산이 이어진 구조입니다. 전체 식을 한꺼번에 펼치면 어떤 값이 어디에 영향을 주는지 놓치기 쉽습니다.
- Graph로 나누면 Forward에서는 중간값을 구하고, Backward에서는 그 중간값을 이용해 각 입력에 대한 Gradient를 계산할 수 있습니다. 다음 편의 Backpropagation은 이 규칙을 체계적으로 적용합니다.

## 작동 원리
- **연속된 경로에서는 미분을 곱합니다.** x가 u에, u가 L에 영향을 준다면 `dL/dx = (dL/du) × (du/dx)`입니다. 여기서는 Scalar 계산으로 생각합니다.
- **경로가 갈라졌다 합쳐지면 더합니다.** 같은 x가 여러 연산의 입력으로 사용되면 각 경로의 영향을 합쳐야 합니다. 한 경로만 계산하면 전체 Gradient가 빠집니다.
- **중간값도 필요합니다.** 곱셈의 미분에는 반대편 입력값이 들어갑니다. 그래서 Forward에서 어떤 중간 결과를 저장할지가 Backward 계산과 연결됩니다.

## 작은 예제로 확인하기
- `u=2x+1`, `L=u²`라고 두고 x가 **3**이면 u는 **7**, L은 **49**입니다. `dL/du=14`, `du/dx=2`이므로 `dL/dx=28`입니다.
- 이번에는 `L=x²+x`라고 합시다. x는 제곱 경로와 덧셈 경로 둘 다에 영향을 줍니다. x가 **3**일 때 각 경로의 변화율은 **6**과 **1**이므로 전체는 **7**입니다.
- 첫 예제는 한 경로에서 곱하는 규칙, 두 번째는 여러 경로의 영향을 더하는 규칙을 보여줍니다. 두 규칙이 함께 쓰입니다.

## 자주 하는 오해
- **Backward가 Forward 연산의 역함수를 구하는 것은 아닙니다.** 출력에서 입력값을 복원하는 것이 아니라 출력 변화가 입력에 얼마나 민감한지 계산합니다.
- **중간 변수라고 Gradient를 버려도 되는 것은 아닙니다.** 앞쪽 Parameter로 Gradient를 전달하는 데 필요합니다. 반복 사용되는 값은 모든 경로의 기여가 모였는지도 확인해야 합니다.

## 복습 질문
- `u=3x`, `L=(u+1)²`에서 x가 **1**일 때 Gradient를 중간 연산별로 구해 보세요.
- 같은 Parameter가 두 경로에 사용되면 왜 두 경로의 Gradient를 더해야 할까요?
