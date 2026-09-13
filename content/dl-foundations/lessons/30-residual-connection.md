---
id: "dl-foundations-30"
title: "Residual Connection과 깊은 CNN"
order: 30
version: 1
status: "draft"
objective: "Residual Connection의 덧셈 경로와 깊은 신경망 학습에서의 역할을 설명할 수 있다."
prerequisites: ["dl-foundations-12", "dl-foundations-25", "dl-foundations-28", "dl-foundations-29"]
sources:
  - {"book": "d2l", "chapter": "8.6 Residual Networks (ResNet) and ResNeXt", "url": "https://d2l.ai/chapter_convolutional-modern/resnet.html"}
---

## 오늘의 핵심
- **Residual Connection**은 Block의 입력 x를 변환 결과 F(x)에 더해 **x + F(x)**를 만듭니다. Block이 입력 전체를 새로 만들기보다 추가로 필요한 변화를 학습하도록 합니다.
- 깊은 구조에서 정보와 Gradient가 흐르는 직접 경로를 제공하는 것이 핵심입니다. 단순히 Layer를 건너뛰어 계산을 항상 생략하는 기능은 아닙니다.

## 왜 필요한가?
- Layer를 더 쌓았는데 Training 성능조차 나빠지는 문제가 생길 수 있습니다. 깊어진 Model이 좋은 변환을 표현할 수 있다는 것과 이를 실제로 학습하기 쉽다는 것은 다릅니다.
- 어떤 구간에서 입력을 그대로 유지하는 것이 좋다면 F(x)를 0에 가깝게 만들 수 있습니다. 모든 변환을 처음부터 다시 학습해야 하는 구조와 다른 출발점입니다.

## 작동 원리
- **두 경로를 더합니다.** 하나는 여러 Layer를 거친 변환 경로, 다른 하나는 입력을 전달하는 Shortcut입니다. 덧셈이므로 두 경로의 Shape가 맞아야 합니다.
- **Shape가 달라지면 맞춥니다.** Channel 수나 공간 크기를 바꾸는 Block에서는 1×1 Convolution 등으로 Shortcut을 투영할 수 있습니다. 이때 Shortcut도 학습되는 변환일 수 있습니다.
- **Backward에도 직접 항이 있습니다.** 단순한 Scalar Block의 미분은 `1 + F'(x)`입니다. 다만 이것이 전체 네트워크에서 Gradient 문제가 절대 생기지 않는다는 보장은 아닙니다.

## 작은 예제로 확인하기
- 입력이 `[2, -1]`, 변환 경로의 출력이 `[0.5, 0.2]`이면 덧셈 결과는 **[2.5, -0.8]**입니다. 입력 표현 위에 보정량이 추가되었습니다.
- F(x)가 `[0, 0]`이면 덧셈 결과는 입력과 같습니다. 여기서는 덧셈 뒤 추가 Activation이 없는 부분만 생각합니다.
- 입력이 `(B, 64, H, W)`인데 변환 출력이 `(B, 128, H/2, W/2)`라면 바로 더할 수 없습니다. Shortcut에도 대응하는 크기 변환이 필요합니다.

## 자주 하는 오해
- **Residual은 Concatenation과 다릅니다.** 덧셈은 대응 원소를 더하고, Concatenation은 Axis를 따라 값을 이어 붙입니다. 출력 Shape도 달라집니다.
- **Shortcut이 있다고 학습 실패가 불가능하지는 않습니다.** 초기값, Normalization, Learning Rate, 데이터 문제는 여전히 영향을 줍니다.

## 복습 질문
- 입력과 F(x)를 더하려면 어떤 Shape 조건을 확인해야 할까요?
- 어떤 Block에서 입력을 거의 유지하는 것이 유리하다면 변환 경로가 어떤 함수를 배우면 될까요?
