---
id: "dl-foundations-21"
title: "Early Stopping과 Data Augmentation"
order: 21
version: 1
status: "draft"
objective: "Early Stopping의 선택 기준과 Label을 보존하는 Data Augmentation을 설명할 수 있다."
prerequisites: ["dl-foundations-16", "dl-foundations-17"]
sources:
  - {"book": "d2l", "chapter": "14.1 Image Augmentation", "url": "https://d2l.ai/chapter_computer-vision/image-augmentation.html"}
  - {"book": "deep-learning", "chapter": "7 Regularization for Deep Learning", "url": "https://www.deeplearningbook.org/contents/regularization.html"}
---

## 오늘의 핵심
- **Early Stopping**은 Validation 지표가 충분히 개선되지 않을 때 학습을 멈추고 적절한 시점의 Model을 선택하는 방법입니다.
- **Data Augmentation**은 Training 입력에 의미를 보존하는 변형을 가해 다양한 관측 조건을 경험하게 합니다. 둘 다 Generalization을 돕지만 작동하는 위치는 다릅니다.

## 왜 필요한가?
- 더 오래 학습한다고 새로운 데이터에서 항상 좋아지지는 않습니다. Early Stopping은 마지막 Model보다 Validation에서 좋았던 시점에 주목합니다.
- Training 이미지가 늘 정면·같은 조명이라면 Model이 그 조건에 의존하기 쉽습니다. Augmentation은 실제로 만날 수 있는 변화에 대한 민감도를 줄이는 데 도움이 될 수 있습니다.

## 작동 원리
- **모니터링 기준을 정합니다.** Validation Loss를 줄일지 특정 지표를 높일지 선택하고, 작은 변동을 개선으로 볼 최소 폭과 기다릴 횟수인 Patience를 정합니다.
- **최고 기록을 저장합니다.** 멈춘 시점과 성능이 가장 좋았던 시점은 다를 수 있으므로 Best Checkpoint를 복원해야 합니다. Test를 중단 시점 선택에 사용하지 않습니다.
- **변형의 의미를 검토합니다.** 이미지 뒤집기나 Crop이 Label을 유지하는지 확인합니다. Object Detection처럼 위치 Label이 있다면 이미지 변형에 맞춰 Label도 변환해야 합니다.

## 작은 예제로 확인하기
- Validation Loss가 **0.60 → 0.50 → 0.52 → 0.55**이고 개선 없는 평가 2회를 기다리는 규칙이라면 마지막 평가에서 중단할 수 있습니다. 선택할 Model은 Loss **0.50**일 때 저장한 것입니다.
- 동물 사진의 좌우 반전은 분류 Label을 유지할 수 있지만, 숫자를 무작정 뒤집으면 의미가 달라질 수 있습니다. 같은 변형이라도 문제에 따라 판단이 달라집니다.
- 사진을 너무 좁게 잘라 대상이 사라졌는데 원래 Label을 붙이면, Augmentation으로 Label Noise를 만든 셈입니다.

## 자주 하는 오해
- **Augmentation은 새로운 독립 샘플을 수집하는 것과 같지 않습니다.** 기존 데이터의 정보와 변형 가정 안에서 다양성을 늘리는 것입니다.
- **Validation에 무작위 변형을 무조건 적용하면 안 됩니다.** 평가 조건이 매번 달라져 비교가 어려워집니다. 평가용 변환을 명확히 고정하세요.

## 복습 질문
- Early Stopping 시점의 Parameter를 그대로 사용하면 Best Checkpoint와 다른 결과가 나올 수 있는 이유는 무엇일까요?
- 손글씨 숫자 분류에서 회전·좌우 반전·밝기 변화 중 어떤 변형을 신중히 검토해야 할까요?
