---
id: "dl-foundations-20"
title: "Dropout"
order: 20
version: 1
status: "draft"
objective: "Dropout의 무작위 Mask와 기대값 보정, 학습·평가 시 동작 차이를 설명할 수 있다."
prerequisites: ["dl-foundations-06", "dl-foundations-17"]
sources:
  - {"book": "d2l", "chapter": "5.6 Dropout", "url": "https://d2l.ai/chapter_multilayer-perceptrons/dropout.html"}
  - {"book": "deep-learning", "chapter": "7 Regularization for Deep Learning", "url": "https://www.deeplearningbook.org/contents/regularization.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch06 · 학습 관련 기술", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch06"}
---

## 오늘의 핵심
- **Dropout**은 학습 중 일부 활성값을 무작위로 0으로 만들어 특정 Unit 조합에 과도하게 의존하는 것을 줄이려는 Regularization 방법입니다.
- 일반적인 **Inverted Dropout**은 살아남은 활성값을 `1 / (1-p)`배로 보정합니다. p는 제거 확률이며, 평가할 때는 이 무작위 제거를 끕니다.

## 왜 필요한가?
- 매번 똑같은 Feature 조합을 사용할 수 있다면 Model이 Training 데이터의 우연한 패턴에 의존할 수 있습니다. 일부 정보가 가려져도 작동하도록 학습시키는 것이 Dropout의 의도입니다.
- 무작위 변화가 추가되므로 Training Loss는 더 높거나 흔들릴 수 있습니다. 목표는 학습 데이터를 가장 쉽게 맞히는 것이 아니라 Validation 성능을 개선하는 것입니다.

## 작동 원리
- **Mask를 추출합니다.** 기본적인 원소별 Dropout은 각 활성값을 확률 p로 0으로 만듭니다. 일반적으로 학습 과정에서 새로운 Mask를 사용합니다.
- **기대값을 보정합니다.** 남는 확률이 1-p이므로 남은 값을 그 확률로 나누면, 입력을 고정했을 때 Mask에 대한 평균 활성값은 원래 값과 같습니다. p는 0 이상 1 미만으로 생각합니다.
- **평가 시에는 제거하지 않습니다.** Inverted Dropout에서는 학습 때 이미 Scale을 보정했으므로 평가 시 원래 활성값을 사용합니다. 구현 방식에 따라 Scale을 적용하는 위치가 다를 수 있습니다.

## 작은 예제로 확인하기
- 활성값이 **6**, 제거 확률이 **0.5**이면 학습 중에는 절반 확률로 **0**, 나머지 절반 확률로 **12**가 됩니다.
- Mask에 대한 기대값은 **0.5 × 0 + 0.5 × 12 = 6**입니다. 한 번의 Forward 결과가 항상 6인 것이 아니라 반복 평균의 성질입니다.
- 평가 모드에서는 제거 없이 **6**을 전달합니다. 평가 때도 Dropout이 켜져 있으면 같은 입력의 예측이 흔들릴 수 있습니다.

## 자주 하는 오해
- **Unit을 영구 삭제하거나 Parameter 수를 줄이는 기법이 아닙니다.** 학습 중 해당 Forward에서 일부 활성값을 가리는 것입니다.
- **기대 활성값이 같다고 전체 Model 출력까지 정확히 같지는 않습니다.** 이후 비선형 연산을 지나므로 평균 출력의 등가성을 일반적으로 보장하지 않습니다.
- **제거 확률이 높을수록 좋은 것은 아닙니다.** 유용한 학습 신호까지 과도하게 줄일 수 있어 Validation에서 판단해야 합니다.

## 복습 질문
- 활성값 **8**, 제거 확률 **0.25**인 Inverted Dropout에서 살아남은 값은 얼마이며 기대값은 어떻게 되나요?
- 평가 성능을 비교할 때 학습·평가 모드 설정을 기록해야 하는 이유는 무엇일까요?
