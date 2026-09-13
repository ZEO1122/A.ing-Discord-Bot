---
id: dl-foundations-01
title: Tensor·Shape·Axis
order: 1
version: 1
status: draft
objective: Shape를 보고 각 Axis의 의미와 전체 원소 수를 설명할 수 있다.
prerequisites: []
sources:
  - book: d2l
    chapter: '2.1 Data Manipulation'
    url: https://d2l.ai/chapter_preliminaries/ndarray.html
---

## 오늘의 핵심
Tensor는 딥러닝에서 수치를 여러 Axis로 배열한 자료 구조입니다. Shape는 각 Axis의 길이를 순서대로 나타냅니다. 값이 같은 개수만큼 있어도 Shape와 Axis의 의미가 다르면 다른 데이터를 표현할 수 있습니다.

## 왜 필요한가?
Model에 입력하기 전에는 숫자 값뿐 아니라 배열의 구조도 확인해야 합니다. 예를 들어 학생 2명의 시험 점수 3개를 담은 `(2, 3)` 배열에서는 첫 Axis가 학생, 두 번째가 과목입니다. 프로그램은 이 의미를 자동으로 알지 못하므로 우리가 정한 데이터 규약을 일관되게 지켜야 합니다.

## 작동 원리
Scalar는 Axis가 없는 수 하나, Vector는 Axis가 하나인 배열, Matrix는 두 개인 배열입니다. `(2, 3)`의 전체 원소 수는 `2 × 3 = 6`입니다. 첫 번째 Axis를 `axis=0`, 두 번째를 `axis=1`로 셉니다.

`sum(axis=0)`은 학생 방향을 합쳐 과목별 합을 만들고, `sum(axis=1)`은 과목 방향을 합쳐 학생별 합을 만듭니다. 연산 뒤 어떤 Axis가 남을지 먼저 예상하면 Shape 오류를 찾기 쉽습니다.

## 작은 예제로 확인하기
아래는 NumPy로 확인하는 예제입니다. 아직 GPU나 자동 미분은 필요하지 않습니다.

```python
import numpy as np
x = np.array([[2, 4, 6], [1, 3, 5]])
print(x.shape, x.size)      # (2, 3) 6
print(x.sum(axis=0))        # [3 7 11]
print(x.sum(axis=1))        # [12 9]
```

`x.reshape(3, 2)`도 원소 6개를 담지만, 이제 각 행을 학생 한 명이라고 해석할 수는 없습니다. Shape 변경이 데이터 의미까지 보존하는지 따로 확인해야 합니다.

## 자주 하는 오해
`reshape`는 Axis를 서로 교환하는 `transpose`와 같지 않습니다. 원소 수가 맞아서 실행된다는 사실만으로 올바른 변환이라고 판단하면 안 됩니다. Shape 옆에 `학생, 과목`처럼 각 Axis의 의미를 적어 두는 습관이 도움이 됩니다.

## 복습 질문
한 반 학생 4명의 과목 점수 5개를 `(4, 5)`에 담았습니다. 학생별 평균과 과목별 평균을 구할 때 각각 어떤 Axis를 줄여야 할까요?
