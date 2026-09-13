---
id: "dl-foundations-28"
title: "Convolution과 Parameter Sharing"
order: 28
version: 1
status: "draft"
objective: "Convolution의 국소 연결과 Parameter Sharing이 이미지 처리에 주는 의미를 설명할 수 있다."
prerequisites: ["dl-foundations-02", "dl-foundations-04"]
sources:
  - {"book": "d2l", "chapter": "7.2 Convolutions for Images", "url": "https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch07 · CNN", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch07"}
---

## 오늘의 핵심
- **Convolution Layer**는 작은 Kernel을 입력의 여러 위치에 적용해 국소 패턴을 찾습니다. 같은 Kernel의 Weight를 위치마다 재사용하는 것이 **Parameter Sharing**입니다.
- 전체 픽셀을 한꺼번에 서로 다른 Weight로 연결하는 방식과 달리, 가까운 위치의 관계와 반복되는 패턴을 활용하는 구조입니다.

## 왜 필요한가?
- 이미지의 경계나 작은 무늬는 여러 위치에서 나타날 수 있습니다. 위치마다 완전히 다른 검출기를 학습하기보다 같은 규칙을 이동시켜 적용하면 Parameter를 효율적으로 사용할 수 있습니다.
- 처음에는 작은 영역을 보더라도 여러 Layer를 쌓으면 더 넓은 영역의 정보를 결합할 수 있습니다. 국소 패턴이 큰 구조의 표현으로 이어지는 것입니다.

## 작동 원리
- **한 위치에서 대응 원소를 곱해 더합니다.** Kernel과 입력 조각의 곱을 합하고 Bias를 더해 출력 원소 하나를 만듭니다.
- **같은 Kernel을 이동합니다.** 이동 간격과 바깥 경계 처리에 따라 출력 크기가 달라집니다. 다음 편에서 Stride와 Padding으로 다룹니다.
- **Channel도 함께 계산합니다.** 일반적인 Kernel은 모든 입력 Channel을 보고 하나의 출력 Channel을 만듭니다. 출력 Channel마다 별도 Kernel이 있으며 공간 위치에 걸쳐 공유합니다.

## 작은 예제로 확인하기
- 입력 Channel **3개**, Kernel 크기 **3×3**, 출력 Channel **8개**인 일반적인 Convolution을 생각해 봅시다. Weight는 **3 × 3 × 3 × 8 = 216개**, 출력별 Bias를 포함하면 **224개**입니다.
- 입력 이미지의 가로·세로가 커져도 Kernel의 Parameter 수는 그대로입니다. 다만 Kernel을 적용할 위치가 늘어 계산량과 활성값 메모리는 증가합니다.
- 1차원 입력 `[1, 2, 4]`에 Kernel `[1, -1]`을 한 칸씩 적용하면 출력은 **-1, -2**입니다. 이 Kernel은 인접 값의 차이에 반응하는 간단한 예입니다.

## 자주 하는 오해
- **딥러닝에서 Convolution이라 부르는 연산은 흔히 Cross-correlation입니다.** 위 예제처럼 Kernel을 뒤집지 않고 적용합니다. 수학적 정의와 용어 차이를 구분하세요.
- **Weight 공유가 위치 정보를 모두 없애는 것은 아닙니다.** 출력에도 공간 배치가 남습니다. 입력이 이동할 때 출력도 대응해 이동하는 성질과, 출력 자체가 변하지 않는 성질은 다릅니다.

## 복습 질문
- 같은 Kernel 설정에서 이미지 크기만 두 배로 늘리면 Parameter 수와 계산량은 각각 어떻게 달라질까요?
- 같은 패턴이 화면의 여러 위치에 나타나는 문제에서 Weight 공유가 왜 유리할까요?
