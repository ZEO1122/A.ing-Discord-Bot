---
id: "dl-foundations-02"
title: "Matrix Multiplication과 Broadcasting"
order: 2
version: 1
status: "draft"
objective: "Matrix Multiplication의 Shape 조건과 Broadcasting의 확장 규칙을 구분할 수 있다."
prerequisites: ["dl-foundations-01"]
sources:
  - {"book": "d2l", "chapter": "2.3 Linear Algebra", "url": "https://d2l.ai/chapter_preliminaries/linear-algebra.html"}
  - {"book": "d2l", "chapter": "2.1 Data Manipulation", "url": "https://d2l.ai/chapter_preliminaries/ndarray.html"}
---

## 오늘의 핵심
- **Matrix Multiplication**은 한 행과 한 열의 대응 원소를 곱해 더하는 연산입니다. 입력 Feature들을 Weight에 따라 섞어 새로운 Feature를 만들 때 사용합니다.
- **Broadcasting**은 길이가 1인 Axis 등을 논리적으로 확장해 원소별 연산을 수행하는 규칙입니다. 행렬 곱과 달리, 그 자체로 Feature들을 곱해 합치는 연산은 아닙니다.

## 왜 필요한가?
- 여러 샘플에 같은 변환을 적용할 때 Matrix Multiplication을 사용하면 샘플별 계산을 하나의 연산으로 표현할 수 있습니다. Batch가 커져도 각 샘플에 적용하는 Weight는 공유합니다.
- 출력마다 Bias를 더할 때는 샘플 수만큼 Bias를 직접 복제할 필요가 없습니다. Broadcasting으로 같은 Bias를 각 샘플에 적용할 수 있지만, 의도한 Axis에 더해지는지 확인해야 합니다.

## 작동 원리
- **행렬 곱의 안쪽 차원이 같아야 합니다.** `(B, D)`와 `(D, H)`를 곱하면 `(B, H)`가 됩니다. D개 입력 Feature를 합쳐 H개 출력을 만드는 것입니다.
- **Broadcasting은 뒤쪽 Axis부터 비교합니다.** 두 길이가 같거나 한쪽이 1이면 호환됩니다. 없는 앞쪽 Axis는 길이 1처럼 취급합니다.
- **허용된 Shape가 올바른 의미를 보장하지는 않습니다.** `(B, 1)`과 `(B,)`의 원소별 연산은 `(B, B)`로 확장될 수 있습니다. 샘플끼리 일대일로 비교하려 했다면 먼저 두 Shape를 맞춰야 합니다.

## 작은 예제로 확인하기
- 샘플 4개에 Feature가 각각 3개라면 입력은 `(4, 3)`입니다. Weight를 `(3, 2)`로 두면 출력은 `(4, 2)`로, 각 샘플에 2개의 점수를 만듭니다.
- 첫 샘플 `[1, 2, 3]`과 첫 출력의 Weight `[2, 0, -1]`의 곱을 합하면 **2 + 0 - 3 = -1**입니다. 이것이 출력 원소 하나를 구하는 과정입니다.
- 여기에 Shape `(2,)`인 Bias를 더하면 두 출력에 해당하는 Bias가 4개 샘플에 공통으로 적용됩니다. Bias가 샘플마다 따로 생기는 것은 아닙니다.

## 자주 하는 오해
- **원소별 곱과 행렬 곱은 다릅니다.** 같은 위치의 값끼리 곱하는 연산에는 Feature를 따라 합산하는 단계가 없습니다.
- **Transpose만으로 무조건 해결하면 안 됩니다.** 오류가 사라져도 Batch와 Feature의 의미가 뒤바뀔 수 있습니다. Shape와 Axis 이름을 함께 적고 변환 목적을 확인하세요.

## 복습 질문
- 입력 `(8, 5)`를 출력 `(8, 3)`으로 만들려면 Weight와 출력별 Bias의 Shape는 각각 무엇이어야 할까요?
- 예측 `(8, 1)`과 정답 `(8,)`을 바로 빼는 것이 왜 위험할까요?
