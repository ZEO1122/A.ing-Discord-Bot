---
id: "dl-foundations-23"
title: "AdaGrad·RMSProp·Adam의 연결"
order: 23
version: 1
status: "draft"
objective: "AdaGrad, RMSProp, Adam이 Gradient 이력을 사용하는 차이를 설명할 수 있다."
prerequisites: ["dl-foundations-22"]
sources:
  - {"book": "d2l", "chapter": "12.7 Adagrad", "url": "https://d2l.ai/chapter_optimization/adagrad.html"}
  - {"book": "d2l", "chapter": "12.8 RMSProp", "url": "https://d2l.ai/chapter_optimization/rmsprop.html"}
  - {"book": "d2l", "chapter": "12.10 Adam", "url": "https://d2l.ai/chapter_optimization/adam.html"}
---

## 오늘의 핵심
- **AdaGrad**는 좌표별 Gradient 제곱을 누적해 업데이트 크기를 조절합니다. **RMSProp**은 제곱 Gradient의 최근 경향을 지수이동평균으로 추적합니다.
- **Adam**은 Gradient 자체의 이동평균과 제곱 Gradient의 이동평균을 함께 사용합니다. 방향을 부드럽게 추정하면서 좌표별 Scale도 조절하는 접근입니다.

## 왜 필요한가?
- 모든 Parameter가 같은 빈도와 크기의 Gradient를 받지는 않습니다. 하나의 Learning Rate만으로는 어떤 좌표는 지나치게 움직이고 다른 좌표는 거의 움직이지 않을 수 있습니다.
- 이 방법들은 Gradient 이력에 따라 좌표별 이동을 조정합니다. 다만 데이터, Loss, 초기값 문제가 자동으로 해결되는 것은 아니며 기본 Learning Rate도 여전히 필요합니다.

## 작동 원리
- **AdaGrad:** Gradient 제곱합의 제곱근으로 현재 Gradient를 나눕니다. 누적값은 줄지 않으므로 학습이 오래 진행되면 업데이트가 지나치게 작아질 수 있습니다.
- **RMSProp:** 누적합 대신 최근 제곱 Gradient의 이동평균을 사용합니다. 오래된 큰 Gradient의 영향이 점차 줄어드는 차이가 있습니다.
- **Adam:** 현재 Gradient 대신 Gradient 이동평균을 사용하고, 제곱 Gradient 이동평균의 제곱근으로 Scale을 맞춥니다. 0에서 시작한 이동평균의 초기 편향을 보정합니다.
- **작은 ε를 더합니다.** 분모가 0에 가까워지는 것을 막는 수치 안정화 항이며, 세부 위치와 기본값은 구현 정의를 확인해야 합니다.

## 작은 예제로 확인하기
- Gradient가 **2, 2**이면 AdaGrad의 제곱 누적값은 **4**, 다음은 **8**입니다. ε를 무시하면 정규화된 Gradient는 **1**, 약 **0.707**로 줄어듭니다.
- Adam에서 첫 Gradient가 **2**, 첫 평균 계수가 **0.9**, 제곱 평균 계수가 **0.999**이면 초기 평균은 각각 **0.2**, **0.004**입니다.
- 첫 Step 편향을 보정하면 각각 **2**, **4**가 됩니다. 이 예는 초기의 작은 평균이 Gradient 자체가 작아서가 아니라 0에서 출발했기 때문임을 보여줍니다.

## 자주 하는 오해
- **Adam이 항상 SGD보다 좋은 최종 성능을 주는 것은 아닙니다.** 학습 속도와 Generalization을 실제 문제에서 비교해야 합니다.
- **Adam의 첫 이동평균은 방향, 두 번째는 제곱 크기 정보입니다.** 두 번째 값을 평균을 뺀 통계적 분산과 동일하게 생각하지 마세요.

## 복습 질문
- AdaGrad가 긴 학습에서 보폭이 작아질 수 있는 이유를 분모의 변화로 설명해 보세요.
- Adam을 사용해도 Learning Rate와 Validation 성능을 확인해야 하는 이유는 무엇일까요?
