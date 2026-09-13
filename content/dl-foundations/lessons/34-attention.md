---
id: "dl-foundations-34"
title: "Attention과 Query·Key·Value"
order: 34
version: 1
status: "draft"
objective: "Query와 Key로 가중치를 만들고 Value를 결합하는 Attention 과정을 설명할 수 있다."
prerequisites: ["dl-foundations-02", "dl-foundations-08", "dl-foundations-31"]
sources:
  - {"book": "d2l", "chapter": "11.1 Queries, Keys, and Values", "url": "https://d2l.ai/chapter_attention-mechanisms-and-transformers/queries-keys-values.html"}
  - {"book": "d2l", "chapter": "11.3 Attention Scoring Functions", "url": "https://d2l.ai/chapter_attention-mechanisms-and-transformers/attention-scoring-functions.html"}
---

## 오늘의 핵심
- **Attention**은 현재 필요한 정보에 맞춰 여러 표현을 다른 비중으로 결합하는 방법입니다. **Query**와 **Key**로 관련도 점수를 계산하고, 그 점수로 **Value**를 가중합합니다.
- Query는 지금 무엇을 찾는지, Key는 비교할 특징, Value는 실제로 가져와 결합할 내용이라는 역할로 이해할 수 있습니다. 이 표현들은 Model 안에서 학습됩니다.

## 왜 필요한가?
- 길이가 긴 입력의 모든 정보를 하나의 고정된 상태에만 담으려 하면 필요한 세부 정보가 약해질 수 있습니다. Attention은 출력 위치마다 참고할 입력 표현을 다르게 조합할 수 있게 합니다.
- 가까운 위치만 보는 것이 아니라 허용된 위치들을 비교할 수 있으므로 멀리 떨어진 정보도 직접 결합할 수 있습니다. 어떤 위치가 허용되는지는 Mask 설정에 달려 있습니다.

## 작동 원리
- **점수를 계산합니다.** Dot-product Attention은 Query와 각 Key의 내적으로 관련도를 구합니다. Scaled Dot-product Attention은 이를 Key 차원의 제곱근으로 나눠 점수 Scale을 조절합니다.
- **Softmax로 비중을 만듭니다.** 하나의 Query에 대해 허용된 Key들 사이의 가중치 합이 1이 되게 합니다. Padding이나 볼 수 없는 위치는 정규화 전에 Mask로 제외합니다.
- **Value를 가중합합니다.** Key는 선택 비중을 계산하는 데 쓰고, 출력 내용은 대응하는 Value에서 가져옵니다. 각 Value에 가중치를 곱해 더한 것이 해당 Query의 결과입니다.

## 작은 예제로 확인하기
- 두 Key에 대한 점수가 같으면 가중치는 각각 **0.5**입니다. Value가 `[2, 0]`과 `[0, 4]`라면 결과는 **[1, 2]**입니다.
- 학습된 점수로 가중치가 **0.75, 0.25**가 되었다면 결과는 **[1.5, 1]**입니다. 같은 Value라도 무엇을 더 참고하느냐에 따라 표현이 달라집니다.
- 이 가중치들은 Query별로 계산됩니다. 문장의 다른 위치에서 묻는 정보가 달라지면 같은 Key·Value 목록을 다른 비중으로 사용할 수 있습니다.

## 자주 하는 오해
- **가장 큰 점수 하나만 고르는 연산은 아닙니다.** 일반적인 Softmax Attention은 여러 Value를 연속적인 비중으로 결합합니다.
- **Attention 가중치를 곧바로 인과적 설명으로 보지 마세요.** 높은 가중치는 이 계산에서의 결합 비중이며, 전체 Model의 판단 이유를 완전히 증명하지는 않습니다.
- **Query·Key·Value의 이름이 사람 언어의 질문·정답을 뜻하지는 않습니다.** 숫자 Vector의 계산상 역할입니다.

## 복습 질문
- 같은 Query에서 두 Key의 점수가 같다면 두 Value는 어떤 비율로 섞일까요?
- Key와 Value가 모두 필요한 이유를 “비교할 특징”과 “가져올 내용”으로 나누어 설명해 보세요.
