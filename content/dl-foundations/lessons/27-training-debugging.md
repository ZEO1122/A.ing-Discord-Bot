---
id: dl-foundations-27
title: '학습 디버깅: 작은 데이터에 먼저 맞춰보기'
order: 27
version: 2
status: draft
objective: 작은 데이터 학습 결과를 통해 구현 오류와 Generalization 문제를 분리할 수 있다.
prerequisites: [dl-foundations-15, dl-foundations-17, dl-foundations-18, dl-foundations-19, dl-foundations-20, dl-foundations-24, dl-foundations-25, dl-foundations-26]
sources:
  - book: deep-learning
    chapter: '11.5 Debugging Strategies'
    url: https://www.deeplearningbook.org/contents/guidelines.html
---

## 오늘의 핵심
- **작은 데이터에 먼저 맞춰보기**는 학습 과정이 제대로 연결되어 있는지 확인하는 진단 방법입니다. 처음부터 전체 데이터로 오래 학습하는 대신, 소수의 고정된 샘플로 원인을 좁힙니다.
- 작은 데이터의 Training Loss를 줄이는 능력과 새로운 데이터에서의 **Generalization**은 별개입니다. 이 검사는 최종 성능 평가가 아니라 본격적인 학습 전 점검입니다.

## 왜 필요한가?
- Loss가 줄지 않는 이유는 Model 크기만이 아닙니다. 입력과 Label이 어긋나거나, 출력과 Loss의 Shape가 잘못되거나, Gradient와 Optimizer가 연결되지 않아도 같은 현상이 나타납니다.
- 큰 데이터와 무작위 Augmentation을 동시에 사용하면 실행마다 조건이 바뀌어 원인을 찾기 어렵습니다. 작은 샘플과 단순한 조건을 고정하면 무엇이 달라졌는지 관찰하기 쉽습니다.
- 긴 학습을 반복하기 전에 이 검사를 하면, Model 구조를 불필요하게 복잡하게 만들거나 잘못된 학습을 오래 실행하는 일을 줄일 수 있습니다.

## 작동 원리
- **조건을 단순화합니다.** Training Set에서 Label이 일관된 소수 샘플을 고정합니다. 진단 실험에서는 불필요한 Augmentation과 Regularization을 잠시 끕니다.
- **학습 경로를 순서대로 확인합니다.** 입력·Label의 대응, 초기 예측과 Loss, Gradient의 유무·크기, 업데이트 전후 Parameter를 차례로 봅니다. NaN이나 무한대가 나타나는지도 확인합니다.
- **한 번에 하나씩 바꿉니다.** Learning Rate와 Model 구조를 동시에 바꾸면 무엇이 원인이었는지 알기 어렵습니다. 관찰한 문제에 맞춰 한 조건을 바꾸고 다시 비교합니다.
- **결과를 나누어 해석합니다.** 작은 데이터에도 맞지 않으면 구현·Optimization·표현 능력을 점검합니다. 작은 데이터에는 맞지만 Validation 성능이 낮다면 Overfitting이나 데이터 분포 차이 등을 살펴봅니다.

## 작은 예제로 확인하기
- 입력 **1, 2**의 정답이 각각 **2, 4**인 데이터라면, Bias 없는 Linear Model도 Weight가 **2**일 때 두 샘플을 정확하게 표현할 수 있습니다. 먼저 이렇게 답이 분명한 문제를 사용합니다.
- **Parameter가 전혀 변하지 않는다면:** Gradient가 계산되는지, Optimizer가 해당 Parameter를 업데이트하는지부터 확인합니다.
- **Parameter는 변하지만 Loss가 커진다면:** Learning Rate가 너무 크거나 업데이트 방향이 잘못됐는지 점검합니다. 입력과 Label의 대응도 다시 확인합니다.
- **작은 샘플에는 맞는다면:** 전체 Training Set으로 확장하고 Validation 성능을 확인합니다. 작은 문제를 풀었다는 사실은 다음 검증으로 넘어갈 근거이지 최종 성능의 보장은 아닙니다.

## 자주 하는 오해
- **작은 데이터에 못 맞춘다고 반드시 코드 오류는 아닙니다.** 같은 입력에 서로 모순된 Label이 있거나 Model의 표현 능력이 부족한 경우도 있습니다.
- **잘 맞춘다고 모든 구현이 맞는 것도 아닙니다.** 일부 오류는 작은 샘플에서 드러나지 않으므로 전체 학습과 데이터 분리 검증이 필요합니다.
- **Test Set으로 맞춰보는 실험이 아닙니다.** Test Set은 보존하고, 진단이 끝나면 원래의 Regularization과 Validation 절차로 돌아가야 합니다.

## 복습 질문
- Parameter는 바뀌지만 Loss가 계속 커진다면, 어떤 조건부터 하나씩 확인하겠습니까? 그 순서를 선택한 이유도 설명해 보세요.
- 작은 Training Set에서 Loss가 충분히 줄었는데 Validation 성능이 낮다면, 왜 Model이 전혀 학습하지 못한다고 단정하면 안 될까요?
