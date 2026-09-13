---
id: "dl-foundations-33"
title: "LSTM·GRU의 Gate"
order: 33
version: 1
status: "draft"
objective: "LSTM과 GRU가 Gate로 과거 상태와 새 정보를 조절하는 방식을 설명할 수 있다."
prerequisites: ["dl-foundations-32"]
sources:
  - {"book": "d2l", "chapter": "10.1 Long Short-Term Memory (LSTM)", "url": "https://d2l.ai/chapter_recurrent-modern/lstm.html"}
  - {"book": "d2l", "chapter": "10.2 Gated Recurrent Units (GRU)", "url": "https://d2l.ai/chapter_recurrent-modern/gru.html"}
---

## 오늘의 핵심
- **LSTM**과 **GRU**는 상태를 매번 같은 방식으로 덮어쓰는 대신 **Gate**로 정보의 유지와 갱신을 조절하는 RNN 구조입니다.
- Gate는 보통 Sigmoid로 만든 0~1 사이 값이며, 각 성분을 얼마나 통과시킬지 조절합니다. 사람이 정한 문법 규칙이 아니라 데이터로 학습되는 연속적인 제어 값입니다.

## 왜 필요한가?
- 기본 RNN은 매 시점 상태를 변환하면서 중요한 과거 정보도 빠르게 바뀔 수 있습니다. 어떤 정보는 오래 유지하고, 어떤 정보는 새 입력으로 바꾸는 구분이 필요합니다.
- Gate와 가산적인 상태 갱신 경로는 장기 의존성 학습을 돕습니다. 하지만 긴 정보를 무한히 기억하거나 Gradient 문제를 완전히 없애는 보장은 아닙니다.

## 작동 원리
- **LSTM은 Cell State를 따로 둡니다.** Forget Gate는 이전 Cell State를 얼마나 남길지, Input Gate는 새 후보 정보를 얼마나 더할지 결정합니다. Output Gate는 Cell State에서 Hidden State로 드러낼 양을 조절합니다.
- **Cell State는 유지분과 추가분을 더합니다.** 대표 식은 `c_t = f_t × c_(t-1) + i_t × candidate_t`입니다. 곱은 성분별 연산이며 Gate도 보통 Vector입니다.
- **GRU는 상태 구조를 간소화합니다.** Update Gate로 이전 상태와 후보 상태를 섞고, Reset Gate로 후보 계산에 과거 상태를 얼마나 반영할지 조절합니다. 별도 Cell State를 두지 않는 일반적인 형태를 생각합니다.

## 작은 예제로 확인하기
- LSTM의 한 성분에서 이전 Cell State가 **2**, Forget Gate가 **0.9**, 후보가 **0.5**, Input Gate가 **0.2**라면 새 Cell State는 **1.8 + 0.1 = 1.9**입니다.
- 과거 정보를 대부분 유지하면서 새 후보를 조금 반영한 결과입니다. 이 값이 곧 Hidden State 전체는 아니며, Tanh와 Output Gate를 통한 별도 출력 계산이 있습니다.
- Forget Gate가 1에 가까우면서 Input Gate가 0에 가까우면 직접 유지 경로에서 기존 정보가 거의 보존됩니다. 정확한 효과는 나머지 계산 경로에도 달려 있습니다.

## 자주 하는 오해
- **Gate는 보통 0 또는 1만 선택하는 스위치가 아닙니다.** 중간 값으로 통과량을 부드럽게 조절합니다.
- **GRU의 식은 Gate 기호 관례가 다를 수 있습니다.** 어떤 자료는 Update Gate가 클수록 과거를 남기고, 다른 표현은 반대 계수로 씁니다. 이름보다 실제 결합 식을 확인하세요.
- **LSTM이 항상 GRU보다 좋지는 않습니다.** Parameter 수, 계산 비용, 데이터와 목표 성능을 비교해야 합니다.

## 복습 질문
- LSTM에서 이전 기억을 유지하면서 새 정보를 거의 쓰지 않으려면 두 Gate는 각각 어떤 값에 가까워야 할까요?
- Cell State와 Hidden State를 구분하는 것이 Output Gate 이해에 왜 필요할까요?
