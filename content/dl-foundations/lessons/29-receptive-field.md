---
id: "dl-foundations-29"
title: "Stride·Padding·Receptive Field·Pooling"
order: 29
version: 1
status: "draft"
objective: "Stride와 Padding에 따른 출력 크기, Receptive Field와 Pooling의 역할을 설명할 수 있다."
prerequisites: ["dl-foundations-28"]
sources:
  - {"book": "d2l", "chapter": "7.3 Padding and Stride", "url": "https://d2l.ai/chapter_convolutional-neural-networks/padding-and-strides.html"}
  - {"book": "d2l", "chapter": "7.5 Pooling", "url": "https://d2l.ai/chapter_convolutional-neural-networks/pooling.html"}
---

## 오늘의 핵심
- **Stride**는 Kernel이 이동하는 간격, **Padding**은 입력 가장자리에 추가하는 값입니다. 둘은 출력의 공간 크기와 경계 정보 처리에 영향을 줍니다.
- **Receptive Field**는 출력 원소 하나가 구조상 영향을 받을 수 있는 입력 영역입니다. **Pooling**은 국소 영역을 최댓값이나 평균 등으로 요약합니다.

## 왜 필요한가?
- 이미지 처리에서는 공간 해상도를 유지할지 줄일지 결정해야 합니다. 작은 물체의 정보를 남겨야 하는지, 넓은 영역의 문맥을 모아야 하는지에 따라 선택이 달라집니다.
- 무작정 크기를 줄이면 세부 정보가 사라질 수 있습니다. 반대로 모든 Layer에서 큰 해상도를 유지하면 계산과 메모리 비용이 커집니다.

## 작동 원리
- **출력 크기를 계산합니다.** Dilation이 1이고 양쪽 Padding이 각각 P이면 한 축의 출력은 `floor((입력 길이 + 2P - Kernel 길이) / Stride) + 1`입니다.
- **층을 쌓으면 보는 영역이 커집니다.** Stride 1인 3×3 Convolution 두 개를 연속 적용하면 내부 출력의 이론적 Receptive Field는 5×5가 됩니다. 앞 Layer의 출력도 이미 여러 입력을 모았기 때문입니다.
- **Pooling은 요약 방식입니다.** Max Pooling은 가장 큰 반응을, Average Pooling은 평균 반응을 남깁니다. 일반적인 고정 Pooling에는 학습할 Weight가 없습니다.

## 작은 예제로 확인하기
- 길이 **5**, Kernel **3**, Padding **1**, Stride **2**라면 출력 길이는 **3**입니다. 2차원에서도 각 축에 같은 규칙을 적용합니다.
- 2×2 영역의 값이 **1, 4, 2, 3**이면 Max Pooling은 **4**, Average Pooling은 **2.5**를 남깁니다. 무엇을 대표값으로 볼지 다른 가정을 쓰는 것입니다.
- 두 방식 모두 네 값의 세부 배치를 잃습니다. 요약 이후에는 원래 위치의 모든 값을 그대로 복원할 수 있다고 생각하면 안 됩니다.

## 자주 하는 오해
- **Padding이 실제 관측 정보를 추가하지는 않습니다.** 경계 처리를 위한 값이며 가장자리의 결과에 영향을 줄 수 있습니다.
- **큰 Receptive Field가 모든 입력을 똑같이 활용한다는 뜻은 아닙니다.** 구조적으로 연결된 범위와 실제 학습된 영향의 분포는 다를 수 있습니다.
- **Pooling이 모든 이동에 완전한 불변성을 보장하지는 않습니다.** 이동 크기와 영역 경계에 따라 결과가 달라질 수 있습니다.

## 복습 질문
- 입력 길이 **7**, Kernel **3**, Padding **0**, Stride **2**이면 출력 길이는 얼마일까요?
- 작은 물체의 위치를 정밀하게 찾아야 할 때 반복적인 Pooling을 신중히 사용해야 하는 이유는 무엇일까요?
