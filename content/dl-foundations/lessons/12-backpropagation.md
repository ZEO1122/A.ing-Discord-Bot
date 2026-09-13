---
id: dl-foundations-12
title: 작은 신경망의 Backpropagation 계산
order: 12
version: 1
status: draft
objective: Chain Rule로 두 Weight의 Gradient를 계산하고 수치 미분으로 검산할 수 있다.
prerequisites: [dl-foundations-04, dl-foundations-06, dl-foundations-07, dl-foundations-11]
sources:
  - book: d2l
    chapter: '5.3 Forward Propagation, Backward Propagation, and Computational Graphs'
    url: https://d2l.ai/chapter_multilayer-perceptrons/backprop.html
  - book: deep-learning-from-scratch
    chapter: 'ch05 · Backpropagation 구현 예제'
    url: https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch05
---

## 오늘의 핵심
Backpropagation은 Loss에서 출발해 Computational Graph의 각 연산을 거슬러 Gradient를 계산합니다. Parameter를 바꾸는 작업은 Optimizer의 역할입니다. 오늘은 미분 계산과 Parameter 업데이트를 구분하며 작은 신경망을 직접 계산합니다.

## 왜 필요한가?
Weight마다 처음부터 전체 식을 미분하면 중복 계산이 많아집니다. Chain Rule을 연산별로 적용하면 이미 구한 중간 Gradient를 앞 단계에 전달할 수 있습니다. Model이 커져도 같은 원리로 각 Parameter에 대한 Loss의 변화율을 구합니다.

## 작동 원리
`x=2, w1=3, w2=0.5, y=4`로 두고 Bias는 생략합니다. Forward는 `z=w1*x=6`, `h=ReLU(z)=6`, `prediction=w2*h=3`입니다. Loss는 계산을 단순화해 `L=(prediction-y)^2/2=0.5`로 정의합니다.

Backward에서는 `dL/dprediction=-1`, `dL/dw2=-1*6=-6`입니다. 이어서 `dL/dh=-1*0.5=-0.5`이고, `z>0`이므로 ReLU의 미분은 1입니다. 따라서 `dL/dw1=-0.5*1*2=-1`입니다. 출력에 가까운 Gradient를 재사용하며 입력 쪽으로 이동했습니다.

## 작은 예제로 확인하기
수치 미분은 작은 변화 전후의 Loss 차이를 비교하는 검산 도구입니다. 아래 코드는 학습용 Backpropagation을 대체하는 구현이 아닙니다.

```python
def loss(w1, w2):
    prediction = w2 * max(0.0, w1 * 2.0)
    return (prediction - 4.0) ** 2 / 2

eps = 1e-5
print((loss(3+eps, .5)-loss(3-eps, .5))/(2*eps))
print((loss(3, .5+eps)-loss(3, .5-eps))/(2*eps))
# 약 -1.0, -6.0
```

## 자주 하는 오해
Gradient가 음수라는 것은 Weight가 나쁘다는 뜻이 아닙니다. 다른 값을 고정했을 때 해당 Weight를 조금 늘리면 Loss가 감소하는 방향이라는 뜻입니다. ReLU가 꺾이는 0에서는 미분 처리에 주의해야 하므로 이 예제는 `z=6`을 사용했습니다.

## 복습 질문
지금 구한 Gradient로 Learning Rate가 `0.1`인 Gradient Descent를 한 번 적용한다면 `w1`과 `w2`는 각각 어떻게 바뀔까요? 업데이트에는 같은 Forward에서 얻은 Gradient를 사용해 보세요.
