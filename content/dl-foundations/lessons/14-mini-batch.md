---
id: "dl-foundations-14"
title: "Batch·Mini-batch·SGD"
order: 14
version: 1
status: "draft"
objective: "Batch 크기, Step, Epoch의 관계와 Mini-batch Gradient의 특성을 설명할 수 있다."
prerequisites: ["dl-foundations-13"]
sources:
  - {"book": "d2l", "chapter": "12.5 Minibatch Stochastic Gradient Descent", "url": "https://d2l.ai/chapter_optimization/minibatch-sgd.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch04 · 신경망 학습", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch04"}
---

## 오늘의 핵심
- **Mini-batch**는 한 번의 업데이트에 사용하는 샘플 묶음입니다. 전체 Training Set 대신 일부 샘플의 Loss와 Gradient로 학습합니다.
- **Step**은 보통 Optimizer 업데이트 한 번, **Epoch**는 Training Set을 한 차례 순회한 단위를 뜻합니다. 같은 Epoch 수라도 Batch 크기가 다르면 Step 수는 달라집니다.

## 왜 필요한가?
- 전체 데이터를 매번 사용하면 Gradient 계산 비용과 메모리 부담이 커집니다. 반대로 샘플 하나씩 처리하면 병렬 계산 장치를 충분히 활용하기 어려울 수 있습니다.
- Mini-batch는 계산 효율과 Gradient 추정의 변동 사이에서 절충합니다. 일부 샘플만 보기 때문에 업데이트 방향에 Noise가 생기지만, 이것이 항상 나쁜 결과만 만드는 것은 아닙니다.

## 작동 원리
- **묶음의 Loss를 집계합니다.** 샘플을 적절히 추출하고 평균 Gradient를 쓰면 전체 평균 Gradient를 추정할 수 있습니다. 샘플링이 치우치면 그 방향도 달라질 수 있습니다.
- **Batch가 커지면 보통 추정의 변동이 줄어듭니다.** 다만 메모리가 더 필요하고 같은 Epoch에서 업데이트 횟수가 줄어듭니다. Learning Rate 등 다른 조건도 함께 검토해야 합니다.
- **순서를 관리합니다.** 일반적인 독립 샘플 학습은 Epoch마다 Shuffle하지만, 시간 순서나 연결된 상태가 중요한 데이터는 목적에 맞는 추출 방식을 정해야 합니다.

## 작은 예제로 확인하기
- 샘플 **1,000개**, Batch 크기 **100**이고 마지막 묶음을 버리지 않는다면 한 Epoch는 **10 Step**입니다. 12 Epoch는 **120번**의 업데이트입니다.
- Batch 크기를 **250**으로 바꾸면 한 Epoch는 **4 Step**입니다. Epoch 수가 같아도 업데이트 횟수가 같지는 않습니다.
- 샘플이 **1,030개**라면 Batch 100 기준 마지막 묶음은 **30개**입니다. 이를 사용할지 버릴지에 따라 한 Epoch의 처리량과 Step 수가 달라집니다.

## 자주 하는 오해
- **SGD라는 말은 샘플 하나만 뜻한다고 단정하기 어렵습니다.** 엄밀한 설명에서는 한 샘플 업데이트를 가리키지만, 실무에서는 Mini-batch SGD도 줄여 부릅니다.
- **Batch를 두 배로 하면 학습이 반드시 두 배 빨라지지는 않습니다.** 장치 활용도, 메모리, 업데이트 수, 목표 성능까지의 시간이 함께 영향을 줍니다.

## 복습 질문
- 샘플 **960개**, Batch 크기 **64**로 5 Epoch 학습하면 업데이트는 몇 번일까요?
- 두 실험의 Epoch 수만 같게 맞추면 동일한 학습량이라고 말하기 어려운 이유는 무엇일까요?
