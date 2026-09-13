---
id: "dl-foundations-08"
title: "Classification·Logits·Softmax"
order: 8
version: 1
status: "draft"
objective: "Logits를 Softmax로 변환하는 과정과 단일 Label Classification의 가정을 설명할 수 있다."
prerequisites: ["dl-foundations-03", "dl-foundations-06"]
sources:
  - {"book": "d2l", "chapter": "4.1 Softmax Regression", "url": "https://d2l.ai/chapter_linear-classification/softmax-regression.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch03 · 신경망", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch03"}
---

## 오늘의 핵심
- **Logits**는 Model이 클래스마다 출력한 정규화 전 점수입니다. 음수가 가능하고 합이 1일 필요도 없습니다.
- **Softmax**는 이 점수들을 양수이며 합이 1인 값으로 바꿉니다. 한 샘플이 여러 클래스 중 하나에 속하는 Classification에서 클래스 확률을 표현할 때 사용합니다.

## 왜 필요한가?
- 가장 큰 점수의 클래스를 선택하는 것만으로는 Model이 정답에 얼마나 높은 확률을 주었는지 알 수 없습니다. 확률 형태로 바꾸면 다음 편의 Cross-Entropy로 학습 신호를 만들 수 있습니다.
- Softmax에서는 클래스들이 같은 합 1을 나눠 갖습니다. 한 이미지에 고양이와 개가 동시에 있을 수 있는 Multi-label 문제는 이 가정과 다르므로 별도의 출력 설계가 필요합니다.

## 작동 원리
- **각 Logit에 지수 함수를 적용하고 전체 합으로 나눕니다.** 클래스 i의 값은 `exp(z_i) / Σexp(z_j)`입니다. 큰 점수는 더 큰 확률을 받지만 다른 점수들과의 상대적 차이가 중요합니다.
- **같은 상수를 더하거나 빼도 결과가 같습니다.** 모든 Logit에서 최댓값을 빼고 계산하면 큰 지수 값 때문에 생기는 Overflow를 줄일 수 있습니다.
- **클래스 Axis에 적용합니다.** `(Batch, Classes)` 출력이라면 각 샘플의 클래스 점수끼리 정규화합니다. Batch 방향으로 계산하면 서로 다른 샘플이 잘못 경쟁합니다.

## 작은 예제로 확인하기
- 세 클래스의 Logits가 **2, 1, 0**이면 최댓값을 빼 **0, -1, -2**로 만들 수 있습니다. Softmax 결과는 약 **0.665, 0.245, 0.090**입니다.
- Logits가 **12, 11, 10**이어도 차이가 같으므로 확률은 같습니다. 점수의 절대 크기보다 상대적 차이가 중요하다는 예입니다.
- 세 점수가 모두 같으면 각 확률은 **1/3**입니다. 이때 어느 클래스도 다른 클래스보다 높은 점수를 받지 않은 상태입니다.

## 자주 하는 오해
- **Softmax가 정답을 보장하지는 않습니다.** 가장 높은 확률을 받은 클래스도 틀릴 수 있고, 높은 확률과 실제 정확도의 일치 여부는 따로 평가해야 합니다.
- **Logits를 입력받는 Loss에 Softmax를 두 번 적용하지 마세요.** 일부 Cross-Entropy 구현은 내부에서 안정적인 Log-Softmax 계산을 수행하므로 입력 규약을 확인해야 합니다.

## 복습 질문
- 모든 Logit에 100을 더하면 Softmax 결과가 달라질까요? 지수 함수의 공통 인자를 생각해 보세요.
- 사진 하나에 여러 동물이 동시에 있는지 각각 판단할 때 Softmax의 합 1 제약이 왜 불편할까요?
