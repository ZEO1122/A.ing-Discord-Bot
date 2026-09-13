---
id: "dl-foundations-05"
title: "Activation Function이 필요한 이유"
order: 5
version: 1
status: "draft"
objective: "Affine Transformation만 쌓는 경우와 비선형 Activation을 넣는 경우의 차이를 설명할 수 있다."
prerequisites: ["dl-foundations-04"]
sources:
  - {"book": "d2l", "chapter": "5.1 Multilayer Perceptrons", "url": "https://d2l.ai/chapter_multilayer-perceptrons/mlp.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch03 · 신경망", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch03"}
---

## 오늘의 핵심
- **Activation Function**은 Layer의 출력에 비선형 변환을 적용합니다. Linear Layer가 Feature를 섞는다면, Activation은 입력에 따라 반응하는 방식을 바꿉니다.
- 비선형성이 있어야 여러 Layer를 쌓아 하나의 Affine Transformation보다 복잡한 관계를 표현할 수 있습니다. Layer 수만 늘리는 것으로 이 효과가 생기지는 않습니다.

## 왜 필요한가?
- 입력과 정답의 관계가 항상 직선이나 하나의 평면으로 나뉘지는 않습니다. 예를 들어 두 조건 중 하나만 참일 때 양성이 되는 XOR은 원래의 두 입력만으로 단일 선형 경계를 만들 수 없습니다.
- Hidden Layer와 비선형 Activation을 함께 사용하면 입력 공간을 다른 표현으로 바꿀 수 있습니다. 뒤 Layer는 이 중간 표현을 결합해 더 복잡한 판단을 만듭니다.

## 작동 원리
- **Affine 연산만 이어 붙이면 합칠 수 있습니다.** 첫 Layer가 `2x + 1`, 다음 Layer가 `3h + 4`라면 전체는 `6x + 7`입니다. 두 Layer여도 결과는 여전히 하나의 직선입니다.
- **Activation은 이 합쳐짐을 막습니다.** ReLU처럼 음수를 0으로 만드는 연산이 중간에 들어가면 입력에 따라 기울기가 달라집니다.
- **표현 능력과 학습 성공은 별개입니다.** 복잡한 함수를 표현할 수 있어도 적절한 데이터, Loss, 초기값, Optimization이 없으면 원하는 함수를 배우지 못할 수 있습니다.

## 작은 예제로 확인하기
- `h = ReLU(2x + 1)` 뒤에 `output = 3h + 4`를 적용해 봅시다. x가 **-1**이면 ReLU 앞의 값은 **-1**, 출력은 **4**입니다.
- x가 **1**이면 ReLU 앞의 값은 **3**, 출력은 **13**입니다. ReLU 앞의 값이 음수인 구간에서는 출력이 4로 유지되고, 양수인 구간에서는 입력에 따라 달라집니다.
- 이런 구간별 반응을 여러 Unit으로 결합하면 서로 다른 조건에 반응하는 표현을 만들 수 있습니다. 단순히 모든 입력을 일정 비율로 늘리는 것과 다릅니다.

## 자주 하는 오해
- **Activation은 반드시 확률을 만드는 함수가 아닙니다.** ReLU 출력은 1보다 클 수 있고, Hidden Activation에는 여러 목적과 형태가 있습니다.
- **모든 Layer 끝에 같은 함수를 넣지는 않습니다.** 마지막 출력은 예측 대상과 Loss에 맞춰 설계합니다. 임의의 실수를 예측해야 하는 Regression 출력에 Sigmoid를 붙이면 범위가 제한됩니다.

## 복습 질문
- 비선형 연산 없이 Affine Layer 10개를 쌓았을 때, 표현 형태가 단일 Affine Layer와 어떻게 연결될까요?
- 음수도 가능한 연속값을 예측하는 마지막 출력에 Sigmoid를 붙이면 어떤 제약이 생길까요?
