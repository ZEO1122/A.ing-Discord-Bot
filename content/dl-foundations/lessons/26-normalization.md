---
id: "dl-foundations-26"
title: "Batch Normalization과 Layer Normalization"
order: 26
version: 1
status: "draft"
objective: "Batch Normalization과 Layer Normalization이 통계를 구하는 Axis와 평가 동작을 구분할 수 있다."
prerequisites: ["dl-foundations-01", "dl-foundations-14", "dl-foundations-25"]
sources:
  - {"book": "d2l", "chapter": "8.5 Batch Normalization", "url": "https://d2l.ai/chapter_convolutional-modern/batch-norm.html"}
  - {"book": "deep-learning-from-scratch", "chapter": "ch06 · 학습 관련 기술", "url": "https://github.com/kchcoo/WegraLee-deep-learning-from-scratch/tree/master/ch06"}
---

## 오늘의 핵심
- **Normalization**은 선택한 값들의 평균과 분산으로 활성값의 Scale을 조절합니다. **Batch Normalization(BN)**과 **Layer Normalization(LN)**은 어떤 값들을 묶어 통계를 계산하는지가 다릅니다.
- 두 방법 모두 보통 학습 가능한 Scale과 Shift를 적용합니다. 단순히 모든 표현을 영구적으로 평균 0, 분산 1에 고정하는 것은 아닙니다.

## 왜 필요한가?
- Layer 내부 값들의 Scale이 크게 달라지면 Optimization이 까다로워질 수 있습니다. Normalization은 중간 표현을 조정해 학습을 돕는 방법입니다.
- Batch 크기가 작거나 샘플 구성이 달라질 때 통계가 어떻게 변하는지도 중요합니다. 이름만 보고 선택하기보다 입력 Shape와 통계 계산 Axis를 확인해야 합니다.

## 작동 원리
- **BN:** `(B, D)` 입력에서는 각 Feature별로 B개 샘플을 모아 통계를 구합니다. CNN의 `(B, C, H, W)`에서는 보통 Channel별로 B·H·W 방향을 함께 사용합니다.
- **LN:** 다른 샘플을 섞지 않고 각 샘플의 지정된 Feature Axis에서 통계를 구합니다. Transformer의 `(B, T, D)`에서는 흔히 Token별 D개 Feature를 정규화합니다.
- **계산:** 평균을 빼고 `sqrt(분산 + ε)`로 나눈 뒤 Scale과 Shift를 적용합니다. ε는 분모를 안정화합니다.
- **평가 동작:** 일반적인 BN은 학습 중 누적한 Running Statistics를 평가에 사용합니다. LN은 각 입력에서 통계를 계산하므로 같은 이유로 학습·평가 통계를 전환하지 않습니다.

## 작은 예제로 확인하기
- 두 샘플이 `[1, 3]`, `[5, 7]`이고 Shape가 `(2, 2)`라고 합시다. BN의 Feature별 평균은 **3, 5**, LN의 샘플별 평균은 **2, 6**입니다.
- BN은 세로로 같은 Feature를 묶고, LN은 가로로 한 샘플의 Feature를 묶었다고 보면 됩니다. 같은 입력에서도 기준이 다릅니다.
- 다른 샘플을 Batch에 추가하면 BN의 학습 통계가 달라질 수 있지만, 이 예제의 LN은 기존 샘플의 통계에 그 새 샘플을 포함하지 않습니다.

## 자주 하는 오해
- **BN을 입력 데이터 전처리와 같은 것으로 보지 마세요.** Model 내부의 여러 위치에서 적용할 수 있고 학습 가능한 Parameter도 포함합니다.
- **BN의 효과를 하나의 원인으로 확정하지 않습니다.** 내부 분포 변화 감소만으로 모든 개선을 설명한다고 단정하기보다 실제 학습 안정성과 성능을 확인해야 합니다.
- **LN의 범위도 설정에 달려 있습니다.** 언제나 Tensor 전체를 정규화하는 것은 아닙니다.

## 복습 질문
- `(Batch, Tokens, Features)`에서 Token별 LN은 어느 Axis를 따라 평균을 계산할까요?
- BN을 쓰는 Model의 평가 모드를 잘못 설정하면 왜 같은 샘플의 예측이 Batch 구성에 영향을 받을 수 있을까요?
