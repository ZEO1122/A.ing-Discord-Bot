---
id: "dl-foundations-09"
title: "Cross-Entropy와 확률 해석"
order: 9
version: 1
status: "draft"
objective: "정답 클래스 확률과 Cross-Entropy의 관계를 설명하고 Accuracy와 구분할 수 있다."
prerequisites: ["dl-foundations-08"]
sources:
  - {"book": "d2l", "chapter": "4.1 Softmax Regression", "url": "https://d2l.ai/chapter_linear-classification/softmax-regression.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch04 · 신경망 학습", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch04"}
---

## 오늘의 핵심
- **Cross-Entropy**는 정답 분포와 예측 분포를 비교하는 Loss입니다. 단일 정답 클래스의 One-hot Label에서는 **정답에 준 확률의 음의 로그**인 `-log(p_true)`로 단순해집니다.
- 정답 확률이 1에 가까우면 Loss가 작고, 0에 가까우면 매우 커집니다. 정답을 거의 불가능하다고 단정한 예측을 강하게 벌주는 형태입니다.

## 왜 필요한가?
- Accuracy는 최종 선택이 맞았는지만 봅니다. 정답 확률이 0.6에서 0.9로 높아져도 둘 다 맞혔다면 Accuracy는 같습니다.
- 학습에는 Parameter의 작은 변화가 예측을 어떻게 개선하는지 나타내는 신호가 필요합니다. Cross-Entropy는 정답 클래스가 선택되었는지뿐 아니라 그 클래스에 부여한 확률도 반영합니다.

## 작동 원리
- **정답 분포로 가중해 로그 확률을 더합니다.** 일반적인 식은 `-Σ y_i log(p_i)`입니다. One-hot이면 정답 위치의 y만 1이라 해당 항만 남습니다.
- **샘플별 Loss를 모읍니다.** 보통 Mini-batch에서 평균을 내지만 가중치나 합산 방식을 사용하기도 합니다. 서로 다른 실행의 Loss를 비교할 때 집계 기준을 확인해야 합니다.
- **확률을 직접 만든 뒤 로그를 취하는 것보다 안정적인 구현을 사용합니다.** 아주 작은 확률이 수치적으로 0이 되면 문제가 생길 수 있어, Logits에서 곧바로 Log-Softmax를 계산하는 방식이 쓰입니다.

## 작은 예제로 확인하기
- 자연로그를 사용할 때 정답 확률이 **0.8**이면 Loss는 약 **0.223**, **0.2**이면 약 **1.609**입니다. 정답 확률이 낮을수록 비용이 커집니다.
- 세 클래스 중 정답 확률이 0.6과 0.9인 두 예측이 모두 가장 높은 점수를 정답에 줬다고 합시다. 둘의 Accuracy는 같지만 Loss는 각각 약 **0.511**, **0.105**로 다릅니다.
- 따라서 Accuracy가 그대로여도 Cross-Entropy가 내려갈 수 있습니다. 같은 정답 선택을 더 높은 확률로 지지하게 된 경우입니다.

## 자주 하는 오해
- **Loss가 낮아지는 것과 모든 오답이 줄어드는 것은 동일하지 않습니다.** 평균 Loss와 오분류 수는 다른 정보를 담으므로 평가 지표를 함께 봐야 합니다.
- **항상 0이 최솟값인 형태만 있는 것은 아닙니다.** 여기서는 One-hot Label을 가정했습니다. 정답 자체가 부드러운 분포인 경우에는 그 분포의 불확실성도 고려해야 합니다.

## 복습 질문
- 정답 확률이 **0.5**인 경우와 **0.1**인 경우 중 어느 쪽 Loss가 더 클까요? 로그 함수의 모양으로 설명해 보세요.
- Accuracy가 유지되는데 Validation Cross-Entropy가 커진다면 어떤 예측 변화가 있었을 수 있을까요?
