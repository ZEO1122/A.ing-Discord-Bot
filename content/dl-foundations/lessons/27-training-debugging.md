---
id: dl-foundations-27
title: '학습 디버깅: 작은 데이터에 먼저 맞춰보기'
order: 27
version: 1
status: draft
objective: 작은 데이터 학습 결과를 통해 구현 오류와 Generalization 문제를 분리할 수 있다.
prerequisites: [dl-foundations-15, dl-foundations-17, dl-foundations-18, dl-foundations-19, dl-foundations-20, dl-foundations-24, dl-foundations-25, dl-foundations-26]
sources:
  - book: deep-learning
    chapter: '11.5 Debugging Strategies'
    url: https://www.deeplearningbook.org/contents/guidelines.html
---

## 오늘의 핵심
큰 데이터로 오래 학습하기 전에, 작고 일관된 데이터에 Model이 맞춰지는지 확인합니다. 이 검사는 성능 경쟁이 아니라 학습 경로가 연결돼 있는지 확인하는 진단입니다. 작은 데이터의 Loss 감소와 새로운 데이터에서의 Generalization은 별개의 문제입니다.

## 왜 필요한가?
Loss가 줄지 않을 때 Model 크기부터 늘리면 원인을 가리기 쉽습니다. 입력과 Label의 대응, 출력과 Loss의 Shape, Gradient 계산, Optimizer 업데이트 중 하나가 잘못돼도 학습이 멈출 수 있습니다. 통제된 작은 예제에서는 각 단계를 직접 관찰하기 쉽습니다.

## 작동 원리
우선 모순 없는 소수의 샘플을 고정하고 불필요한 Augmentation과 Regularization을 진단 실험에서 잠시 끕니다. 초기 Loss, Gradient 크기, 업데이트 전후 Parameter, 예측값을 차례로 확인합니다. 매번 하나만 바꾸며 원인을 좁힙니다.

작은 데이터에도 맞지 않으면 구현·Optimization·표현 능력을 점검합니다. 잘 맞지만 Validation 성능이 낮다면 데이터 분포나 Overfitting을 살펴봅니다. 단, 작은 데이터에 맞는다는 사실만으로 모든 구현이 올바르다고 증명되지는 않습니다.

## 작은 예제로 확인하기
먼저 Bias 없는 Linear Model이 `y=2x`라는 단순 규칙을 학습하는지 봅니다.

```python
xs, ys = [1.0, 2.0], [2.0, 4.0]
w = 0.0
for _ in range(30):
    grad = sum((w*x-y)*x for x, y in zip(xs, ys))/2
    w -= 0.1 * grad
final_loss = sum((w*x-y)**2 for x, y in zip(xs, ys))/4
print(round(w, 3), final_loss < 1e-6)
# 2.0 True
```

Loss는 `sum((prediction-y)^2)/(2*N)`입니다. Parameter가 전혀 변하지 않는다면 업데이트 식과 Gradient 연결부터 확인합니다.

## 자주 하는 오해
진단을 위해 Training Loss를 낮추는 실험은 Test Set에 맞추라는 뜻이 아닙니다. Test Set은 따로 보존하고, 진단을 마치면 원래의 Regularization·데이터 분리·Validation 절차로 돌아가야 합니다. 모순된 Label이나 Model 용량 부족도 작은 데이터 적합을 방해할 수 있습니다.

## 복습 질문
Parameter는 바뀌는데 Loss가 계속 커진다면 무엇을 먼저 확인하겠습니까? Learning Rate, Gradient 부호, Label 대응 중 하나씩 통제해 확인하는 순서를 제안해 보세요.
