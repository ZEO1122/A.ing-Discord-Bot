---
id: "dl-foundations-04"
title: "Linear Layer와 Bias"
order: 4
version: 1
status: "draft"
objective: "Linear Layer가 Feature를 결합하는 방식과 Bias의 역할을 설명할 수 있다."
prerequisites: ["dl-foundations-02", "dl-foundations-03"]
sources:
  - {"book": "d2l", "chapter": "3.1 Linear Regression", "url": "https://d2l.ai/chapter_linear-regression/linear-regression.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch03 · 신경망", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch03"}
---

## 오늘의 핵심
- **Linear Layer**는 입력 Feature의 가중합에 Bias를 더합니다. 입력 Vector x를 `Wx + b`로 변환하는 형태이며, Batch를 행으로 놓으면 `XW + b`처럼 표기하기도 합니다.
- Weight는 입력들이 출력에 반영되는 방식을, Bias는 입력과 별개인 출력의 기본 위치를 조정합니다. Bias가 포함된 변환은 수학적으로 **Affine Transformation**입니다.

## 왜 필요한가?
- 실제 예측은 여러 정보를 함께 보아야 합니다. 공부 시간과 이전 점수처럼 서로 다른 Feature를 결합해 하나의 수치나 여러 클래스의 점수를 만들 수 있습니다.
- Bias가 없다면 모든 입력이 0일 때 출력도 0으로 제한됩니다. Bias는 이런 제약을 풀어 입력 공간에서 기준점을 옮길 수 있게 합니다.

## 작동 원리
- **출력 하나마다 Weight 묶음이 있습니다.** 입력이 D개라면 출력 하나는 D개의 Weight와 Bias 하나를 사용합니다. 출력이 H개면 일반적으로 Parameter는 `D × H + H`개입니다.
- **샘플 간에는 Parameter를 공유합니다.** Batch 크기가 B여도 Parameter 수에 B를 곱하지 않습니다. 같은 변환을 B개 샘플에 반복 적용하기 때문입니다.
- **Feature의 Scale도 중요합니다.** 큰 단위의 입력과 작은 단위의 입력이 섞이면 Weight의 숫자만으로 영향력을 비교하기 어렵습니다. 입력 범위와 함께 해석해야 합니다.

## 작은 예제로 확인하기
- 입력이 `[2, 3]`, Weight가 `[4, -1]`, Bias가 **5**라면 출력은 **2 × 4 + 3 × (-1) + 5 = 10**입니다.
- Bias를 **0**으로 바꾸면 출력은 **5**가 됩니다. 입력의 조합은 그대로지만 기본 위치가 달라집니다.
- 입력 Feature 3개로 출력 2개를 만드는 Layer는 Weight **6개**와 Bias **2개**, 총 **8개** Parameter를 갖습니다. 샘플을 100개 넣어도 이 개수는 같습니다.

## 자주 하는 오해
- **Bias는 데이터의 편향을 뜻하는 용어와 구분해야 합니다.** 여기서는 학습되는 덧셈 항을 말합니다.
- **Linear Layer만 여러 번 쌓으면 표현이 계속 복잡해지는 것은 아닙니다.** 중간에 비선형 연산이 없으면 전체가 하나의 Affine Transformation으로 합쳐집니다. 다음 편에서 Activation이 필요한 이유를 다룹니다.

## 복습 질문
- 입력 5개, 출력 4개인 Layer에 Bias가 있다면 Parameter는 몇 개일까요?
- 모든 입력이 0인데 출력이 0이 아니어도 되는 문제에서 Bias가 어떤 역할을 할까요?
