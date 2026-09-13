---
id: dl-foundations-12
title: 작은 신경망의 Backpropagation 계산
order: 12
version: 2
status: draft
objective: Chain Rule로 Gradient가 전달되는 과정을 설명하고 Parameter 업데이트와 구분할 수 있다.
prerequisites: [dl-foundations-04, dl-foundations-06, dl-foundations-07, dl-foundations-11]
sources:
  - book: d2l
    chapter: '5.3 Forward Propagation, Backward Propagation, and Computational Graphs'
    url: https://d2l.ai/chapter_multilayer-perceptrons/backprop.html
  - book: deep-learning-from-scratch
    chapter: 'ch05 · Backpropagation 구현 예제'
    url: https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch05
---

## 오늘의 핵심
- **Backpropagation**은 Loss에서 출발해 Computational Graph를 거슬러 올라가며 각 Parameter의 Gradient를 계산하는 방법입니다.
- 핵심은 **Chain Rule로 중간 Gradient를 재사용하는 것**입니다. Gradient 계산은 Backpropagation, 그 값을 이용한 Parameter 변경은 Optimizer의 역할입니다.

## 왜 필요한가?
- 신경망의 출력은 여러 연산을 거쳐 만들어집니다. 앞쪽 Weight가 Loss에 미치는 영향을 알려면 중간 연산들을 통해 변화가 어떻게 전달되는지 계산해야 합니다.
- Weight마다 전체 계산을 처음부터 반복하면 같은 중간 결과를 여러 번 구하게 됩니다. Backpropagation은 출력 쪽에서 계산한 Gradient를 앞 단계에서 재사용해 이런 중복을 줄입니다.
- 이를 위해 Forward에서 얻은 입력과 중간 활성값 등을 저장합니다. Gradient를 효율적으로 구하는 대신 중간값을 보관할 메모리가 필요합니다.

## 작동 원리
- **Forward:** 입력에서 예측값과 Loss를 계산합니다. 각 연산의 입력·출력은 뒤에서 해당 연산의 미분을 계산할 때 쓰입니다.
- **Backward:** 각 연산은 뒤에서 전달받은 Gradient에 자신의 입력에 대한 미분을 연결합니다. Scalar 연산에서는 두 값을 곱하는 Chain Rule로 이해할 수 있습니다.
- **여러 경로가 만나면 합산:** 같은 Parameter가 여러 경로로 Loss에 영향을 주면, 각 경로를 통해 전달된 Gradient를 더해야 전체 영향을 구할 수 있습니다.
- **업데이트:** 모든 Gradient를 구한 뒤 Optimizer가 Weight를 바꿉니다. Gradient Descent는 Learning Rate만큼 Gradient의 반대 방향으로 이동합니다.

## 작은 예제로 확인하기
- 입력이 **2**, 첫 Weight가 **3**, 두 번째 Weight가 **0.5**인 작은 신경망을 생각해 봅시다. 첫 곱셈과 ReLU를 거친 값은 **6**, 최종 예측은 **3**입니다. Bias는 생략합니다.
- 정답이 **4**이고 Loss를 “예측 오차 제곱의 절반”으로 두면 Loss는 **0.5**입니다. 예측이 정답보다 작으므로 예측값에 대한 Gradient는 **-1**입니다.
- 두 번째 Weight의 Gradient는 **-1 × 6 = -6**입니다. 첫 Weight까지는 두 번째 Weight **0.5**, ReLU의 미분 **1**, 입력 **2**를 거치므로 **-1 × 0.5 × 1 × 2 = -1**입니다.
- 이 음수 Gradient는 다른 값을 고정한 채 각 Weight를 조금 늘리면 현재 Loss가 줄어드는 방향임을 뜻합니다. 큰 폭으로 바꿔도 계속 줄어든다는 보장은 아닙니다.

## 자주 하는 오해
- **Gradient가 크다고 더 중요한 Weight라는 뜻은 아닙니다.** Gradient는 현재 입력과 Parameter 값에서의 국소적인 변화율이며 값의 Scale에도 영향을 받습니다.
- **Backpropagation이 곧 학습 전체는 아닙니다.** 데이터 준비, Loss 정의, Gradient 계산, Optimizer 업데이트가 함께 연결돼야 학습이 진행됩니다.
- **ReLU는 모든 곳에서 같은 미분을 갖지 않습니다.** 위 예제는 입력이 양수여서 미분이 1입니다. 음수에서는 0이며, 정확히 0에서는 미분값을 따로 정해 처리합니다.

## 복습 질문
- 계산한 Gradient에 Learning Rate **0.1**인 Gradient Descent를 적용하면 두 Weight는 각각 어떻게 바뀔까요?
- Backpropagation을 실행했는데 Weight가 그대로라면, 학습 과정에서 어떤 단계가 빠졌을 수 있을까요?
