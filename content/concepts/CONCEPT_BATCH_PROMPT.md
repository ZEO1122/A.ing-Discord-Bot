# GPT Prompt — concept 브리핑 markdown 50개 생성용

아래 프롬프트를 그대로 GPT에 넣어서, 딥러닝 개념 브리핑 markdown 파일 50개를 한 번에 또는 여러 번 나누어 생성할 수 있다.

```text
당신은 AI 학술동아리용 Discord 브리핑 콘텐츠 에디터다.

목표:
- 딥러닝 핵심 개념 브리핑 markdown 파일 50개를 만든다.
- 출력은 저장소에 바로 넣을 수 있는 markdown 형식이어야 한다.
- 각 파일은 초보자도 읽을 수 있어야 하고, 1~2분 안에 핵심을 이해할 수 있어야 한다.
- 최근 동향 뉴스가 아니라 "안정적인 개념 설명"을 만든다.

반드시 지켜야 할 규칙:
1. 모든 출력은 한국어로 쓴다.
2. 코드 블록 바깥의 설명은 최소화하고, 결과물 위주로 출력한다.
3. 각 개념은 파일 하나로 분리한다.
4. 각 파일은 아래 markdown 포맷을 정확히 따른다.
5. `discussion_prompt`와 채점형 퀴즈는 분리한다.
6. 공개용 브리핑에는 정답 키나 채점 기준을 쓰지 않는다.
7. source는 가능한 한 교과서적이거나 대표적인 논문/문서 기준으로 넣는다.
8. 너무 최신 이슈나 뉴스성 표현은 피한다.

반드시 사용할 markdown 포맷:

---
briefing_key: <고유 키>
track: dl-basics
mode: concept
title: <개념 제목>
one_line: <한 줄 요약>
discussion_prompt: <토론 질문 한 줄>
sources:
  - title: <출처 제목>
    url: <출처 URL>
    source_type: <paper|docs|book|blog>
---

## 무슨 내용인가
<개념 설명 3~5문장>

## 왜 중요한가
<왜 중요한지 2~4문장>

## 쉬운 용어
- <용어1>: <설명>
- <용어2>: <설명>
- <용어3>: <설명>

생성 대상 개념 예시:
- Perceptron
- MLP
- Backpropagation
- Gradient Descent
- SGD
- Mini-batch
- Overfitting
- Regularization
- Dropout
- Batch Normalization
- CNN
- Convolution
- Pooling
- RNN
- LSTM
- GRU
- Attention
- Self-Attention
- Transformer
- Positional Encoding
- Embedding
- Fine-tuning
- Transfer Learning
- Contrastive Learning
- Autoencoder
- Variational Autoencoder
- GAN
- Diffusion Model
- Reinforcement Learning
- Policy Gradient
- Q-Learning
- Replay Buffer
- Multi-head Attention
- Residual Connection
- Layer Normalization
- Tokenization
- Vocabulary
- Loss Function
- Cross Entropy
- Optimizer
- Adam
- Learning Rate Scheduler
- Data Augmentation
- Label Smoothing
- Beam Search
- Zero-shot Learning
- Few-shot Learning
- Prompt Tuning
- Retrieval-Augmented Generation
- Multimodal Learning

출력 방식:
- 총 50개를 만든다.
- 각 결과는 아래 형식으로 구분한다.

=== FILE START: <filename>.md ===
<markdown 본문>
=== FILE END ===

파일명 규칙:
- 모두 소문자 snake-case 또는 kebab-case
- 예: `attention.md`, `gradient-descent.md`

품질 기준:
- 초보자가 읽어도 이해 가능한 설명
- 지나치게 딱딱한 논문 요약 금지
- 한 줄 요약은 짧고 명확하게
- discussion_prompt는 모임에서 1분 정도 이야기해볼 수 있는 질문으로 작성
- 쉬운 용어는 정말 초심자 기준으로 설명

한 번에 50개가 너무 길면, 10개씩 5묶음으로 나눠 출력하라.
각 묶음마다 파일 구분 형식을 유지하라.
```
