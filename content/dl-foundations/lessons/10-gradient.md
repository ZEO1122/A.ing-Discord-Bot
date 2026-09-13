---
id: "dl-foundations-10"
title: "Derivative·Partial Derivative·Gradient"
order: 10
version: 1
status: "draft"
objective: "Derivative와 Partial Derivative를 구분하고 Gradient의 부호와 방향을 해석할 수 있다."
prerequisites: ["dl-foundations-07"]
sources:
  - {"book": "d2l", "chapter": "2.4 Calculus", "url": "https://d2l.ai/chapter_preliminaries/calculus.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch04 · 신경망 학습", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch04"}
---

## 오늘의 핵심
- **Derivative**는 입력을 아주 조금 바꿨을 때 함수가 얼마나 변하는지 나타내는 국소적인 변화율입니다.
- 변수가 여러 개이면 다른 변수를 고정하고 한 변수만 바꾸는 **Partial Derivative**를 구합니다. 이 값들을 모든 변수에 대해 모은 Vector가 **Gradient**입니다.

## 왜 필요한가?
- 학습에서는 수많은 Weight를 어느 방향으로 조정할지 알아야 합니다. 가능한 값을 전부 시험하기보다, 현재 지점에서 Loss가 변하는 방향을 Gradient로 추정합니다.
- Gradient는 “이 Weight가 좋은가?”라는 평가표가 아닙니다. 현재 입력과 Parameter 조건에서 작은 변화가 Loss에 미치는 영향을 나타냅니다.

## 작동 원리
- **한 변수의 기울기부터 봅니다.** `f(w)=w²`이면 미분은 `2w`입니다. w가 2일 때 기울기는 4이므로, w를 조금 늘리면 f가 증가합니다.
- **여러 변수에서는 각각 따로 계산합니다.** `L(a,b)=a²+3b²`의 Gradient는 `(2a, 6b)`입니다. a를 미분할 때 b는 고정하고, b를 미분할 때 a는 고정합니다.
- **방향도 읽을 수 있습니다.** 미분 가능한 지점에서 Euclidean 거리로 아주 작은 이동을 비교하면 Gradient 방향은 가장 빠른 증가 방향입니다. 그 반대 방향이 Gradient Descent의 출발점입니다.

## 작은 예제로 확인하기
- a가 **1**, b가 **2**이면 Loss는 **13**, Gradient는 **(2, 12)**입니다. 두 변수에 대한 민감도가 현재 지점에서 다릅니다.
- a를 **0.01**만 늘리면 Loss 변화는 일차 근사로 **0.02**입니다. b를 같은 크기만큼 늘리면 일차 근사로 **0.12**입니다.
- 실제 변화에는 작은 고차항도 포함됩니다. Gradient는 국소 근사이므로 큰 이동 뒤에도 같은 변화율이 유지된다고 생각하면 안 됩니다.

## 자주 하는 오해
- **Gradient가 0이라고 최솟값이 보장되지는 않습니다.** 최댓값이나 Saddle Point에서도 0일 수 있습니다.
- **크기를 곧바로 중요도로 해석하지 마세요.** 변수의 단위와 Scale을 바꾸면 Partial Derivative의 크기도 달라집니다. 비교에는 입력과 Parameter의 표현 방식이 함께 필요합니다.

## 복습 질문
- `f(w)=w²`에서 w가 **-2**이면 Gradient의 부호는 무엇이며, w를 조금 늘릴 때 함수값은 어떻게 변할까요?
- 여러 Parameter의 Gradient를 구할 때 “다른 변수를 고정한다”는 조건이 왜 필요할까요?
