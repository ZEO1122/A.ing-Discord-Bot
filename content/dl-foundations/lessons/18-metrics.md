---
id: "dl-foundations-18"
title: "Accuracy·Precision·Recall·F1"
order: 18
version: 1
status: "draft"
objective: "Confusion Matrix로 Precision과 Recall을 계산하고 목적에 맞는 평가 지표를 선택할 수 있다."
prerequisites: ["dl-foundations-08", "dl-foundations-16"]
sources:
  - {"book": "deep-learning", "chapter": "11 Practical Methodology", "url": "https://www.deeplearningbook.org/contents/guidelines.html"}
---

## 오늘의 핵심
- **Accuracy**는 전체 예측 중 맞힌 비율입니다. **Precision**은 양성이라고 예측한 것 중 실제 양성의 비율, **Recall**은 실제 양성 중 찾아낸 비율입니다.
- **F1**은 Precision과 Recall의 조화평균입니다. 어떤 실수가 중요한지에 따라 적절한 지표가 달라지므로 Accuracy 하나만 보지 않습니다.

## 왜 필요한가?
- 중요한 사건이 드문 데이터에서는 모두 음성이라고 해도 Accuracy가 높을 수 있습니다. 예를 들어 이상 징후가 1%인 데이터에서 항상 정상이라고 하면 99%를 맞히지만 이상을 하나도 찾지 못합니다.
- 잘못 울린 경보를 줄이고 싶은지, 놓친 사건을 줄이고 싶은지에 따라 관심 지표가 달라집니다. 무엇을 양성으로 정의했는지도 먼저 밝혀야 합니다.

## 작동 원리
- **Confusion Matrix를 구성합니다.** 실제 양성을 맞히면 TP, 음성을 양성으로 잘못 예측하면 FP, 양성을 놓치면 FN, 음성을 맞히면 TN입니다.
- **분모가 다릅니다.** Precision은 `TP / (TP + FP)`, Recall은 `TP / (TP + FN)`입니다. F1은 `2 × Precision × Recall / (Precision + Recall)`입니다.
- **Threshold를 함께 봅니다.** 양성 판단 기준을 바꾸면 예측 양성 수와 지표가 달라집니다. Threshold 선택은 Validation에서 하고 최종 Test에 맞춰 반복 조정하지 않습니다.

## 작은 예제로 확인하기
- 샘플 **100개** 중 실제 양성이 **20개**이고, Model이 양성이라 한 **15개** 중 실제 양성이 **12개**라고 합시다.
- TP는 **12**, FP는 **3**, FN은 **8**, TN은 **77**입니다. Precision은 **80%**, Recall은 **60%**, Accuracy는 **89%**입니다.
- F1은 약 **68.6%**입니다. Accuracy만 보면 괜찮아 보여도 실제 양성 20개 중 8개를 놓쳤다는 사실을 Recall에서 읽을 수 있습니다.

## 자주 하는 오해
- **F1이 모든 비용을 표현하지는 않습니다.** TN을 직접 반영하지 않고, 놓친 사건과 잘못된 경보의 실제 비용도 자동으로 담지 않습니다.
- **분모가 0인 경우를 명시해야 합니다.** 양성 예측이 전혀 없으면 Precision 식은 정의되지 않습니다. 도구의 처리 규칙을 확인하고 임의로 완벽한 성능이라고 해석하지 마세요.
- **여러 클래스는 평균 방식도 중요합니다.** 클래스별 동일 비중의 Macro 평균과 전체 건수를 모으는 Micro 평균은 다른 결과를 낼 수 있습니다.

## 복습 질문
- 경보가 너무 많이 울려 사용자가 무시하게 된다면 Precision과 Recall 중 무엇을 특히 확인해야 할까요?
- 실제 양성이 매우 드문 데이터에서 높은 Accuracy만 보고 배포하면 어떤 위험이 있을까요?
