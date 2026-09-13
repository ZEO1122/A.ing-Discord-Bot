---
id: "dl-foundations-15"
title: "학습 루프: Forward·Backward·Update"
order: 15
version: 1
status: "draft"
objective: "Forward, Loss, Backward, Update의 순서와 Gradient 초기화가 필요한 이유를 설명할 수 있다."
prerequisites: ["dl-foundations-03", "dl-foundations-12", "dl-foundations-14"]
sources:
  - {"book": "d2l", "chapter": "3.4 Linear Regression Implementation from Scratch", "url": "https://d2l.ai/chapter_linear-regression/linear-regression-scratch.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch05 · Backpropagation", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch05"}
---

## 오늘의 핵심
- 기본 학습 루프는 **데이터 묶음 → Forward → Loss → Backward → Update**를 반복합니다. 각 단계의 역할이 다르며 하나가 빠져도 학습이 멈추거나 잘못될 수 있습니다.
- 새 업데이트를 시작할 때는 이전 Gradient를 어떻게 처리할지 정해야 합니다. 보통은 초기화하고, 의도적인 **Gradient Accumulation**을 할 때만 누적합니다.

## 왜 필요한가?
- Model이 예측을 잘 출력한다고 학습도 올바르다는 뜻은 아닙니다. Loss가 Parameter와 연결돼 있는지, Gradient가 계산되는지, Optimizer가 실제 Weight를 바꾸는지를 각각 확인해야 합니다.
- 학습과 평가는 목적이 다릅니다. 평가는 Parameter를 바꾸지 않고 성능을 측정해야 하므로 학습 단계와 명확히 구분해야 합니다.

## 작동 원리
- **Forward와 Loss:** Mini-batch를 Model에 넣고 예측과 Label을 비교합니다. Shape, Label 형식, 합산·평균 기준을 확인합니다.
- **Backward:** 같은 Forward에서 계산한 Loss로 Gradient를 구합니다. 이전 Step의 Gradient가 남아 있으면 의도치 않게 더해질 수 있습니다.
- **Update:** Optimizer가 학습 대상 Parameter를 바꿉니다. 다음 Step에서는 바뀐 Parameter로 새로운 Forward를 수행합니다.
- **평가 모드:** Dropout과 Batch Normalization처럼 모드에 따라 동작이 다른 Layer는 평가 설정이 필요합니다. Gradient 기록을 끄는 것과 Layer를 평가 모드로 바꾸는 것은 별개의 설정입니다.

## 작은 예제로 확인하기
- 첫 Mini-batch의 Gradient가 **2**, 다음 Mini-batch의 Gradient가 **3**이라고 합시다. 독립적으로 업데이트하려 했다면 두 번째에 사용할 Gradient는 **3**입니다.
- Gradient를 초기화하지 않고 누적하면 두 번째에 **5**가 사용될 수 있습니다. 이는 원래 의도와 다른 업데이트를 만듭니다.
- 반대로 메모리 때문에 두 묶음을 합쳐 한 번 업데이트하려는 경우에는 누적을 의도적으로 사용합니다. 이때 샘플 수에 맞게 Loss를 Scale하고, 정해진 묶음 수 뒤에 한 번만 Update해야 합니다.

## 자주 하는 오해
- **Backward만 호출해도 Weight가 바뀌는 것은 아닙니다.** Gradient 계산 뒤 실제 Update가 있어야 합니다.
- **Validation Loss로 계속 Backward하면 평가 데이터도 학습에 사용됩니다.** 일반적인 검증에서는 업데이트 없이 결과만 관찰하고, 설정 선택에 사용했다는 점도 구분해야 합니다.

## 복습 질문
- Loss는 계산되는데 Parameter가 전혀 바뀌지 않는다면 어느 두 단계를 우선 확인하겠습니까?
- Gradient Accumulation을 할 때 “초기화 시점”과 “업데이트 시점”을 함께 정해야 하는 이유는 무엇일까요?
