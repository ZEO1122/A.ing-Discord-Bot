---
id: "dl-foundations-24"
title: "Learning Rate Schedule과 Warmup"
order: 24
version: 1
status: "draft"
objective: "Learning Rate Schedule과 Warmup의 목적을 구분하고 Step 기준을 확인할 수 있다."
prerequisites: ["dl-foundations-13", "dl-foundations-23"]
sources:
  - {"book": "d2l", "chapter": "12.11 Learning Rate Scheduling", "url": "https://d2l.ai/chapter_optimization/lr-scheduler.html"}
---

## 오늘의 핵심
- **Learning Rate Schedule**은 학습 진행에 따라 Learning Rate를 바꾸는 규칙입니다. 초반의 이동과 후반의 세밀한 조정을 같은 보폭으로 처리하지 않도록 합니다.
- **Warmup**은 초기에 작은 Learning Rate에서 시작해 목표 값까지 점진적으로 올리는 구간입니다. 이후 값을 줄이는 Schedule과 함께 사용할 수 있습니다.

## 왜 필요한가?
- 무작위 초기 Parameter와 아직 안정되지 않은 Optimizer 상태에서 큰 업데이트를 하면 학습이 불안정해질 수 있습니다. Warmup은 이 초기 움직임을 완만하게 만드는 선택지입니다.
- 후반에도 보폭이 계속 크면 좋은 지점 주변에서 흔들릴 수 있습니다. 다만 무조건 빨리 줄이면 필요한 만큼 학습하기 전에 이동이 작아질 수 있으므로 전체 학습 길이를 고려해야 합니다.

## 작동 원리
- **감소 규칙을 선택합니다.** 특정 시점마다 줄이는 Step Decay, 부드럽게 줄이는 Cosine Schedule, Validation 개선이 멈출 때 줄이는 방식 등이 있습니다.
- **시간 단위를 명확히 합니다.** Scheduler를 Optimizer Step마다 호출하는지 Epoch마다 호출하는지에 따라 실제 변화 속도가 달라집니다. Gradient Accumulation을 사용하면 데이터 묶음 수와 업데이트 수도 다릅니다.
- **Warmup과 본 Schedule을 연결합니다.** Warmup이 끝나는 시점과 최고 Learning Rate, 이후 감소 구간의 길이를 함께 정합니다. 재시작할 때 현재 Step과 Scheduler 상태도 복원해야 같은 계획이 이어집니다.

## 작은 예제로 확인하기
- 첫 **4 Step**에서 Learning Rate를 **0.025, 0.05, 0.075, 0.1**로 올리기로 했다고 합시다. 이후 Step부터 별도 감소 규칙을 적용합니다.
- “매 10 Step마다 절반”이라는 규칙을 실수로 10 Epoch마다 적용하면, 한 Epoch에 100 Step인 학습에서는 감소 시점이 크게 늦어집니다.
- 따라서 설정 숫자뿐 아니라 실제 Step별 Learning Rate 기록을 봐야 의도한 Schedule이 실행되었는지 알 수 있습니다.

## 자주 하는 오해
- **Warmup은 데이터 일부만 먼저 학습한다는 뜻이 아닙니다.** 여기서는 Learning Rate의 초기 변화 규칙을 말합니다.
- **Adam을 쓰면 Schedule이 필요 없다는 뜻은 아닙니다.** 좌표별 조정과 전체 Learning Rate의 시간 변화는 서로 다른 역할입니다.
- **모든 문제에서 Warmup이 필수인 것은 아닙니다.** 초기 불안정성과 Validation 성능을 기준으로 유용한지 판단합니다.

## 복습 질문
- Gradient Accumulation으로 Mini-batch 4개마다 업데이트한다면, Step 기반 Scheduler는 언제 진행시키는 것이 자연스러울까요?
- Learning Rate를 너무 일찍 낮췄을 때 Learning Curve에서 어떤 현상을 예상할 수 있을까요?
