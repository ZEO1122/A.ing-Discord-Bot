---
id: "dl-foundations-35"
title: "Self-Attention·Multi-head·Position"
order: 35
version: 1
status: "draft"
objective: "Self-Attention, Multi-head Attention, 위치 정보의 역할을 구분할 수 있다."
prerequisites: ["dl-foundations-34"]
sources:
  - {"book": "d2l", "chapter": "11.5 Multi-Head Attention", "url": "https://d2l.ai/chapter_attention-mechanisms-and-transformers/multihead-attention.html"}
  - {"book": "d2l", "chapter": "11.6 Self-Attention and Positional Encoding", "url": "https://d2l.ai/chapter_attention-mechanisms-and-transformers/self-attention-and-positional-encoding.html"}
---

## 오늘의 핵심
- **Self-Attention**은 같은 Sequence의 표현에서 Query·Key·Value를 만들어 각 Token이 다른 Token의 정보를 결합하게 합니다.
- **Multi-head Attention**은 여러 Projection으로 별도의 Attention을 계산한 뒤 결과를 합칩니다. **위치 정보**는 내용만으로 구분하기 어려운 Token의 순서나 상대적 위치를 알려줍니다.

## 왜 필요한가?
- 같은 단어도 주변 문맥에 따라 표현이 달라져야 합니다. Self-Attention은 Token 간 관계를 반영한 표현을 만듭니다.
- 관계의 기준 하나만으로 모든 정보를 결합하기는 어려울 수 있습니다. 여러 Head는 서로 다른 표현 공간에서 관계를 계산할 여지를 줍니다. 특정 Head가 항상 정해진 문법 역할을 맡는다고 보장되지는 않습니다.

## 작동 원리
- **같은 입력에서 서로 다른 Projection을 만듭니다.** Q, K, V의 출처가 같아도 사용하는 Weight는 보통 달라 계산 결과가 같지 않습니다.
- **Head별 결과를 결합합니다.** 각 Head가 Attention을 계산하고 결과를 Concatenation한 뒤 출력 Projection을 적용합니다. Head 수와 Model 차원에 따라 Head별 차원을 정합니다.
- **순서 신호를 제공합니다.** 위치 정보나 순서를 담는 Mask 없이 내용만 보는 Self-Attention은 입력 순서를 바꾸면 출력 순서도 대응해 바뀌는 구조입니다. 절대 위치를 더하는 Positional Encoding이나 상대 위치를 반영하는 방법 등을 사용합니다.
- **길이에 따른 비용을 봅니다.** 기본 Dense Self-Attention은 길이 T의 Token 쌍마다 점수를 계산해 T×T 관계를 다룹니다.

## 작은 예제로 확인하기
- Model 차원이 **128**, Head가 **4개**이고 균등하게 나누는 구성이라면 각 Head의 차원은 **32**입니다. 네 결과를 이어 붙이면 다시 **128**차원이 됩니다.
- Token이 **10개**이면 Head 하나의 점수 배열은 **10×10**입니다. Token이 **20개**이면 **20×20**으로, 관계 점수 수는 네 배가 됩니다.
- “A가 B를 돕는다”와 “B가 A를 돕는다”는 같은 단어가 있어도 의미가 다릅니다. 내용과 함께 순서를 표현해야 하는 이유입니다.

## 자주 하는 오해
- **Self-Attention이 자기 Token만 본다는 뜻은 아닙니다.** 허용된 범위 안에서 같은 Sequence의 다른 Token도 참고합니다.
- **Head를 늘린다고 반드시 성능이 높아지지는 않습니다.** 전체 차원을 고정하면 Head별 차원이 줄어들고 계산 구조도 달라집니다.
- **모든 위치 기법이 입력에 Vector를 더하는 형태는 아닙니다.** 여기서는 역할을 이해하고 구체적인 방법은 구조별로 확인합니다.

## 복습 질문
- Q, K, V를 같은 입력에서 만든다는 것과 세 값이 동일하다는 것은 왜 다를까요?
- 기본 Dense Attention에서 Sequence 길이가 두 배가 되면 쌍별 점수 수는 어떻게 달라질까요?
