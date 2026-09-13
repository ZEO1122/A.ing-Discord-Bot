---
id: "dl-foundations-17"
title: "Overfitting·Underfitting·Learning Curve"
order: 17
version: 1
status: "draft"
objective: "Training과 Validation Learning Curve를 함께 읽고 다음 점검 방향을 제안할 수 있다."
prerequisites: ["dl-foundations-16"]
sources:
  - {"book": "d2l", "chapter": "3.6 Generalization", "url": "https://d2l.ai/chapter_linear-regression/generalization.html"}
  - {"book": "d2l", "chapter": "4.6 Generalization in Classification", "url": "https://d2l.ai/chapter_linear-classification/generalization-classification.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch06 · 학습 관련 기술", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch06"}
---

## 오늘의 핵심
- **Underfitting**은 학습 데이터의 관계도 충분히 표현하거나 학습하지 못한 상태입니다. **Overfitting**은 Training에 맞춘 정도에 비해 새로운 데이터의 성능이 좋지 않은 상태입니다.
- **Learning Curve**는 학습 진행에 따른 Loss나 지표의 변화를 그린 것입니다. Training과 Validation을 함께 봐야 학습 자체의 문제와 Generalization 문제를 나누어 생각할 수 있습니다.

## 왜 필요한가?
- Training Loss가 계속 내려간다는 사실만으로 배포할 Model을 고를 수는 없습니다. 새로운 데이터에서 오류가 커지고 있다면 더 오래 학습하는 것이 오히려 나쁠 수 있습니다.
- 반대로 Training과 Validation이 모두 좋지 않으면 Regularization을 더 강하게 하는 것보다 입력, Optimization, 표현 능력을 먼저 점검하는 편이 적절할 수 있습니다.

## 작동 원리
- **둘 다 나쁜 경우:** 학습이 덜 되었는지, Learning Rate가 맞는지, Feature나 Label에 문제가 있는지 확인합니다. 바로 Model 크기만 바꾸지 않습니다.
- **Training은 좋아지고 Validation은 나빠지는 경우:** Overfitting 가능성을 살펴봅니다. 데이터 분포 차이와 평가 과정 오류도 함께 확인합니다.
- **비교 조건을 맞춥니다.** Dropout, Augmentation, Loss의 Regularization 항 때문에 Training과 Validation 숫자가 직접 비교되지 않을 수 있습니다. 동일한 평가 설정으로 다시 보는 과정이 필요합니다.

## 작은 예제로 확인하기
- 같은 기준으로 계산한 Loss가 Epoch **1, 5, 10**에서 Training은 **0.9, 0.4, 0.1**, Validation은 **1.0, 0.5, 0.8**이라고 합시다.
- Training은 계속 좋아졌지만 Validation은 5 Epoch 이후 나빠졌습니다. 10 Epoch가 마지막이라는 이유만으로 선택하기보다, 5 Epoch 부근의 Model과 비교할 근거가 생겼습니다.
- 두 Loss가 모두 0.9 근처에서 멈췄다면 같은 처방을 내리기 어렵습니다. 학습이 실제로 진행되는지와 적절한 Baseline 대비 성능부터 점검합니다.

## 자주 하는 오해
- **Training과 Validation 차이가 작다고 좋은 Model은 아닙니다.** 둘 다 나쁘면 차이가 작아도 유용하지 않습니다.
- **Validation Loss가 잠깐 올랐다고 즉시 Overfitting으로 단정하지 마세요.** 측정 변동과 평가 표본 수를 고려하고 여러 시점의 추세를 봐야 합니다.

## 복습 질문
- Training Loss는 줄지만 Validation Loss가 여러 번 연속 증가한다면 다음 실험에서 무엇을 바꾸겠습니까?
- Training Loss가 Validation보다 높게 나타날 수 있는 설정상의 이유를 하나 설명해 보세요.
