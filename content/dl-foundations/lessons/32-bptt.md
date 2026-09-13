---
id: "dl-foundations-32"
title: "BPTT와 장기 의존성 문제"
order: 32
version: 1
status: "draft"
objective: "BPTT와 Truncated BPTT의 차이, 장기 Gradient 문제를 설명할 수 있다."
prerequisites: ["dl-foundations-12", "dl-foundations-25", "dl-foundations-31"]
sources:
  - {"book": "d2l", "chapter": "9.7 Backpropagation Through Time", "url": "https://d2l.ai/chapter_recurrent-neural-networks/bptt.html"}
---

## 오늘의 핵심
- **BPTT(Backpropagation Through Time)**는 RNN을 시간축으로 펼친 Computational Graph에 Backpropagation을 적용하는 방법입니다.
- 같은 Parameter가 여러 시점에서 사용되므로 각 사용 지점의 Gradient 기여를 모아 업데이트합니다. 시간이 길어지면 Gradient 전달 경로도 길어집니다.

## 왜 필요한가?
- 마지막 출력의 오류가 앞 시점에서 읽은 중요한 정보 때문일 수 있습니다. RNN을 학습하려면 시간에 걸친 상태 갱신까지 추적해 어떤 Parameter가 영향을 줬는지 계산해야 합니다.
- 긴 Sequence는 많은 중간값을 저장하고 연산해야 합니다. 또한 미분의 연쇄 곱으로 과거의 영향이 작아지거나 지나치게 커져 장기 의존성을 학습하기 어려워질 수 있습니다.

## 작동 원리
- **시간별 계산을 펼칩니다.** 반복문 안의 같은 RNN Cell을 여러 시점의 노드로 표현하지만, 각 노드의 Weight는 별개가 아니라 공유됩니다.
- **뒤에서 앞으로 Gradient를 전달합니다.** 시점별 Loss와 이후 상태에서 전달된 영향을 함께 반영합니다. 공유 Weight에 대한 모든 해당 경로의 기여가 더해집니다.
- **Truncated BPTT는 추적 길이를 제한합니다.** 일정 구간 뒤에서 Graph 연결을 끊어 비용을 줄입니다. Hidden State 값은 다음 구간으로 넘길 수 있지만 이전 구간으로 Gradient가 전달되지는 않습니다.
- **Clipping은 큰 Gradient를 제한합니다.** Gradient Norm이 기준을 넘으면 Scale을 줄이는 식입니다. 사라진 장기 신호를 되살리는 방법은 아닙니다.

## 작은 예제로 확인하기
- 단순한 경로에서 시점마다 상태 미분이 **0.5**라면 10시점을 거친 곱은 약 **0.001**입니다. 마지막 Loss가 아주 앞의 상태에 주는 신호가 작아질 수 있습니다.
- 반대로 매번 **2**라면 곱은 **1,024**입니다. 실제 RNN은 행렬과 Activation을 포함하지만, 경로 길이가 수치 안정성과 연결된다는 점을 보여줍니다.
- 100 Token을 20 Token 구간으로 나누고 경계에서 연결을 끊으면, 상태 값은 이어 갈 수 있어도 나중 구간의 Loss로 아주 앞 구간의 연산을 직접 미분하지는 못합니다.

## 자주 하는 오해
- **Truncation과 상태 초기화는 같은 작업이 아닙니다.** 계산 Graph만 끊는 것과 기억한 상태 값을 0으로 만드는 것은 다릅니다.
- **Gradient를 모두 작게 만들면 안전하다는 뜻은 아닙니다.** 너무 강한 Clipping은 유용한 업데이트까지 줄입니다. 장기 의존성이 필요한지와 실제 Gradient 크기를 함께 봐야 합니다.

## 복습 질문
- 같은 Weight가 5개 시점에 사용되었다면 Gradient를 시점별로 따로 업데이트하기보다 모아야 하는 이유는 무엇일까요?
- Truncated BPTT에서 상태는 전달되는데 장기 Gradient 경로는 끊긴다는 것을 설명해 보세요.
