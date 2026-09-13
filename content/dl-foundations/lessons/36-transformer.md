---
id: "dl-foundations-36"
title: "Transformer 전체 흐름과 과정 종합 복습"
order: 36
version: 1
status: "draft"
objective: "Transformer의 Token 표현부터 Loss까지 연결하고 Encoder와 Decoder의 Attention 범위를 구분할 수 있다."
prerequisites: ["dl-foundations-09", "dl-foundations-15", "dl-foundations-26", "dl-foundations-30", "dl-foundations-35"]
sources:
  - {"book": "d2l", "chapter": "11.7 The Transformer Architecture", "url": "https://d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html"}
---

## 오늘의 핵심
- **Transformer**는 Attention으로 Token 사이 정보를 섞고, Feed-Forward Network로 각 Token의 Feature를 변환하는 Block을 쌓습니다. Residual Connection과 Normalization도 함께 사용합니다.
- 이번 과정의 Tensor, Linear Layer, Activation, Loss, Backpropagation, Optimization이 이 구조 안에서 다시 연결됩니다. Attention 하나만으로 Model 전체가 완성되는 것은 아닙니다.

## 왜 필요한가?
- 새로운 논문을 읽을 때 구성요소의 이름만 외우면 무엇이 달라졌는지 파악하기 어렵습니다. 입력 표현, 정보가 섞이는 위치, 학습 목표, 평가 조건으로 나누면 변경점을 추적하기 쉽습니다.
- Encoder와 Decoder는 비슷한 Block을 사용해도 볼 수 있는 정보와 역할이 다릅니다. 특히 다음 Token 예측에서는 정답인 미래 Token을 미리 보지 않게 해야 합니다.

## 작동 원리
- **입력을 표현합니다.** Token을 Embedding Vector로 바꾸고 위치 정보를 반영합니다. 이후 계산은 보통 `(Batch, Tokens, Features)` 같은 구조로 진행됩니다.
- **Block을 통과합니다.** Attention은 Token 간 정보를 결합하고, Positionwise Feed-Forward Network는 같은 MLP를 각 위치에 적용합니다. Residual과 Layer Normalization의 배치 순서는 구조에 따라 다릅니다.
- **정보 접근을 제한합니다.** 기본 Encoder는 유효한 입력 Token들을 함께 봅니다. Autoregressive Decoder의 Self-Attention은 미래를 가립니다. Encoder–Decoder 구조에서는 Decoder가 Encoder 출력에 Cross-Attention할 수도 있습니다.
- **목표로 학습합니다.** 다음 Token 예측이라면 Vocabulary Logits를 만들고 정답 Token에 대한 Cross-Entropy를 계산해 Backpropagation과 Optimizer Update를 수행합니다.

## 작은 예제로 확인하기
- 입력을 “나는 / 오늘 / 학교에”, 다음 Token 정답을 “오늘 / 학교에 / 간다”로 한 칸 이동시킨 학습을 생각해 봅시다.
- 첫 위치가 “오늘”을 예측할 때는 입력의 뒤쪽 “오늘”을 보면 안 됩니다. Causal Mask가 이런 미래 정보 접근을 막아야 합니다.
- 학습에서는 정답으로 구성한 앞 문맥과 Mask를 사용해 여러 위치의 Loss를 함께 계산할 수 있습니다. 생성에서는 아직 다음 Token이 없으므로 예측한 Token을 붙이며 순서대로 진행합니다.

## 자주 하는 오해
- **모든 Transformer가 Encoder와 Decoder를 둘 다 갖는 것은 아닙니다.** Encoder-only나 Decoder-only 구조도 있으며 목적에 따라 달라집니다.
- **학습 위치를 병렬 계산할 수 있다고 생성 전체가 한 번에 끝나는 것은 아닙니다.** Autoregressive 생성은 앞서 생성한 Token에 의존합니다.
- **구조 이름만으로 성능을 판단하지 마세요.** 학습 데이터, Loss, 계산량, 평가 분할과 Baseline까지 함께 비교해야 합니다.

## 복습 질문
- Feed-Forward Network와 Attention 중 Token 사이 정보를 직접 섞는 부분은 어느 쪽이며, 다른 쪽은 어떤 역할을 할까요?
- 다음 AI 논문을 읽을 때 “입력·구조·학습 목표·평가” 중 무엇이 바뀌었는지 네 항목으로 정리해 보세요.
