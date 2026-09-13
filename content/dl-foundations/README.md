# 딥러닝 기초 36회 과정

월·수·금 오전 9시, 12주 과정의 Markdown 초안입니다. 학기 시작일은 미정이며 자동 발송은 비활성 상태입니다.
전체 36편을 작성했으며 운영 승인 검토는 남아 있습니다.

각 편은 학습 목표와 여섯 설명 섹션, 참고 자료로 구성됩니다. 글머리 기호를 사용하며 코드 대신 수치·상황 예제로 원리를 설명합니다.
복습 질문은 자유롭게 생각해 보는 학습 질문이며 채점하지 않습니다.

| 주차 | 월요일 | 수요일 | 금요일 |
|---|---|---|---|
| 1 | [01 · Tensor·Shape·Axis](lessons/01-tensors-and-shapes.md) | [02 · Matrix Multiplication과 Broadcasting](lessons/02-matmul-and-broadcasting.md) | [03 · Parameter·Model·Forward Pass](lessons/03-parameters-and-forward.md) |
| 2 | [04 · Linear Layer와 Bias](lessons/04-linear-layer.md) | [05 · Activation Function이 필요한 이유](lessons/05-activation-purpose.md) | [06 · ReLU·Sigmoid·Tanh 비교](lessons/06-activation-comparison.md) |
| 3 | [07 · Regression과 MSE](lessons/07-mse.md) | [08 · Classification·Logits·Softmax](lessons/08-logits-and-softmax.md) | [09 · Cross-Entropy와 확률 해석](lessons/09-cross-entropy.md) |
| 4 | [10 · Derivative·Partial Derivative·Gradient](lessons/10-gradient.md) | [11 · Chain Rule과 Computational Graph](lessons/11-chain-rule.md) | [12 · 작은 신경망의 Backpropagation 계산](lessons/12-backpropagation.md) |
| 5 | [13 · Gradient Descent와 Learning Rate](lessons/13-gradient-descent.md) | [14 · Batch·Mini-batch·SGD](lessons/14-mini-batch.md) | [15 · 학습 루프: Forward·Backward·Update](lessons/15-training-loop.md) |
| 6 | [16 · Train·Validation·Test와 Data Leakage](lessons/16-data-splits.md) | [17 · Overfitting·Underfitting·Learning Curve](lessons/17-learning-curves.md) | [18 · Accuracy·Precision·Recall·F1](lessons/18-metrics.md) |
| 7 | [19 · L2 Regularization과 Weight Decay](lessons/19-weight-decay.md) | [20 · Dropout](lessons/20-dropout.md) | [21 · Early Stopping과 Data Augmentation](lessons/21-early-stopping.md) |
| 8 | [22 · Momentum](lessons/22-momentum.md) | [23 · AdaGrad·RMSProp·Adam의 연결](lessons/23-adam.md) | [24 · Learning Rate Schedule과 Warmup](lessons/24-lr-schedule.md) |
| 9 | [25 · Vanishing·Exploding Gradient와 Initialization](lessons/25-initialization.md) | [26 · Batch Normalization과 Layer Normalization](lessons/26-normalization.md) | [27 · 학습 디버깅: 작은 데이터에 먼저 맞춰보기](lessons/27-training-debugging.md) |
| 10 | [28 · Convolution과 Parameter Sharing](lessons/28-convolution.md) | [29 · Stride·Padding·Receptive Field·Pooling](lessons/29-receptive-field.md) | [30 · Residual Connection과 깊은 CNN](lessons/30-residual-connection.md) |
| 11 | [31 · Sequence 표현과 RNN](lessons/31-rnn.md) | [32 · BPTT와 장기 의존성 문제](lessons/32-bptt.md) | [33 · LSTM·GRU의 Gate](lessons/33-gated-rnn.md) |
| 12 | [34 · Attention과 Query·Key·Value](lessons/34-attention.md) | [35 · Self-Attention·Multi-head·Position](lessons/35-self-attention.md) | [36 · Transformer 전체 흐름과 과정 종합 복습](lessons/36-transformer.md) |

휴강 기간이 정해지면 순서를 건너뛰지 않고 다음 발송일로 미룹니다. 각 파일의 prerequisites에 선수 개념 ID가 있습니다.

## 검토 방법

1. 학습 목표를 읽고 해당 편이 설명하려는 범위를 확인합니다.
2. 수치 예제와 자주 하는 오해를 원리·출처와 대조합니다.
3. 복습 질문을 통해 다음 개념으로 넘어갈 준비가 되었는지 확인합니다.
4. 운영에 사용할 최종 문구를 검토한 뒤 승인 상태와 내용 해시를 등록합니다.

[운영·승인 절차](../../docs/CONCEPT_NOTIFICATIONS.md) · [이번 집필 검증 기록](../../docs/CONCEPT_CONTENT_REVIEW.md)
