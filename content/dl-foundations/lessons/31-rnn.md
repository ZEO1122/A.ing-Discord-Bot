---
id: "dl-foundations-31"
title: "Sequence 표현과 RNN"
order: 31
version: 1
status: "draft"
objective: "RNN의 Hidden State와 시간에 걸친 Parameter Sharing을 설명할 수 있다."
prerequisites: ["dl-foundations-03", "dl-foundations-04", "dl-foundations-06"]
sources:
  - {"book": "d2l", "chapter": "9.4 Recurrent Neural Networks", "url": "https://d2l.ai/chapter_recurrent-neural-networks/rnn.html"}
---

## 오늘의 핵심
- **Sequence**는 순서가 의미를 갖는 데이터입니다. **RNN(Recurrent Neural Network)**은 현재 입력과 이전 **Hidden State**를 함께 사용해 새 상태를 계산합니다.
- Hidden State는 앞에서 읽은 정보를 다음 시점으로 전달하는 중간 표현입니다. 같은 갱신 규칙과 Parameter를 시간에 걸쳐 반복 사용합니다.

## 왜 필요한가?
- 같은 단어라도 앞 문맥에 따라 뜻과 다음에 올 단어가 달라질 수 있습니다. 각 입력을 따로 처리하면 이런 순서와 누적 정보를 놓치기 쉽습니다.
- RNN은 길이가 다른 입력도 같은 갱신 규칙으로 처리할 수 있습니다. 다만 고정된 크기의 상태가 과거의 모든 정보를 완벽하게 기억한다고 보장되지는 않습니다.

## 작동 원리
- **상태를 초기화합니다.** 첫 입력 전의 상태를 0으로 두거나 학습 가능한 값 등으로 정합니다. 서로 독립적인 Sequence 사이에 상태를 잘못 이어 붙이지 않아야 합니다.
- **입력과 이전 상태를 결합합니다.** 기본 형태는 `h_t = Activation(W_x x_t + W_h h_(t-1) + b)`입니다. t가 달라져도 W_x, W_h, b는 공유합니다.
- **목적에 맞게 출력을 읽습니다.** 문장 전체 분류에서는 마지막 상태 등을 사용하고, 다음 Token 예측에서는 여러 시점의 상태에서 출력을 계산할 수 있습니다. 상태 갱신은 앞 시점에 의존하므로 순차적입니다.

## 작은 예제로 확인하기
- 원리를 보기 위해 Activation을 Identity로 둔 단순한 갱신 `h_t = 0.5h_(t-1) + x_t`를 생각해 봅시다. 초기 상태는 **0**, 입력 순서는 **2, 0, 1**입니다.
- 상태는 차례로 **2 → 1 → 1.5**가 됩니다. 첫 입력의 영향이 뒤 시점까지 전달되지만 점차 줄어듭니다.
- 순서를 **1, 0, 2**로 바꾸면 상태는 **1 → 0.5 → 2.25**입니다. 입력 값들이 같아도 순서가 다르면 최종 상태가 달라집니다.

## 자주 하는 오해
- **Hidden State와 Parameter는 다릅니다.** 상태는 입력과 시간에 따라 달라지고, Parameter는 반복 갱신에 사용하는 학습된 규칙입니다.
- **Sequence가 길어졌다고 시간별 Weight를 새로 만들지는 않습니다.** Parameter는 공유하지만 저장할 활성값과 계산량은 늘어날 수 있습니다.
- **앞 문맥을 사용한다고 미래까지 자동으로 볼 수 있는 것은 아닙니다.** 기본적인 단방향 RNN은 지금까지 전달된 입력만 사용합니다.

## 복습 질문
- 동일한 문장 단어들을 순서만 바꿨을 때 RNN 출력이 달라질 수 있는 이유는 무엇일까요?
- 관련 없는 두 문장을 처리하면서 Hidden State를 계속 공유하면 어떤 정보가 섞일 수 있을까요?
