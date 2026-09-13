---
id: "dl-foundations-03"
title: "Parameter·Model·Forward Pass"
order: 3
version: 1
status: "draft"
objective: "입력, Parameter, 중간 활성값의 역할과 Forward Pass의 흐름을 구분할 수 있다."
prerequisites: ["dl-foundations-01", "dl-foundations-02"]
sources:
  - {"book": "d2l", "chapter": "6.2 Parameter Management", "url": "https://d2l.ai/chapter_builders-guide/parameters.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch03 · 신경망", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch03"}
---

## 오늘의 핵심
- **Model**은 입력을 출력으로 변환하는 계산 구조입니다. **Parameter**는 이 계산에서 학습으로 조정되는 Weight와 Bias 같은 값입니다.
- **Forward Pass**는 현재 Parameter를 사용해 예측을 계산하는 과정입니다. 예측을 만들었다는 사실만으로 Parameter가 학습되거나 바뀌지는 않습니다.

## 왜 필요한가?
- 학습을 이해하려면 무엇을 입력으로 주고, 무엇을 학습으로 바꾸는지 먼저 나누어야 합니다. 같은 입력이라도 Parameter가 달라지면 예측은 달라질 수 있습니다.
- Layer가 여러 개면 앞 Layer의 출력이 다음 Layer의 입력이 됩니다. 각 단계의 중간 활성값은 입력에 따라 달라지며, 그 자체를 독립적인 학습 Parameter로 취급하지는 않습니다.

## 작동 원리
- **입력에서 시작합니다.** 이미지의 픽셀이나 정리된 Feature를 Model에 전달합니다. 입력 Shape는 Model이 기대하는 구조와 일치해야 합니다.
- **현재 Parameter로 연산합니다.** 각 Layer에서 행렬 곱, Bias 덧셈, Activation 등을 수행하고 중간 표현을 다음 Layer로 넘깁니다.
- **목적에 맞는 출력을 얻습니다.** Regression은 수치, Classification은 클래스별 Logits를 만들 수 있습니다. 학습 때는 이 출력과 Label로 Loss를 계산한 뒤 별도 단계에서 Parameter를 업데이트합니다.

## 작은 예제로 확인하기
- 한 입력 x에 대해 `prediction = w × x + b`라는 Model을 생각해 봅시다. x가 **3**, w가 **2**, b가 **1**이면 Forward 결과는 **7**입니다.
- 같은 Parameter로 x만 **4**로 바꾸면 결과는 **9**입니다. 입력이 달라진 것이며 학습이 일어난 것은 아닙니다.
- 반대로 학습으로 w가 **1.5**가 되면 x가 **3**일 때 결과는 **5.5**가 됩니다. 같은 구조 안에서도 학습된 값이 예측을 바꾸는 것입니다.

## 자주 하는 오해
- **Parameter와 Hyperparameter는 역할이 다릅니다.** Weight는 보통 학습으로 조정하지만 Learning Rate나 Layer 수는 실험 설정으로 정합니다.
- **Parameter 수가 많다고 항상 더 잘 예측하지는 않습니다.** 표현 능력 외에도 데이터, 학습 방식, Generalization이 영향을 줍니다. 큰 Model은 저장 공간과 계산 비용도 늘립니다.

## 복습 질문
- 입력, Weight, 중간 활성값 중 샘플을 바꿨을 때 달라지는 것은 무엇이며, 학습 업데이트로 바꾸는 것은 무엇일까요?
- 같은 입력으로 Forward를 여러 번 수행하는 것만으로 학습이 진행된다고 볼 수 있을까요?
