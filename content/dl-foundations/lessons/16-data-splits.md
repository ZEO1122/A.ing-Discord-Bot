---
id: "dl-foundations-16"
title: "Train·Validation·Test와 Data Leakage"
order: 16
version: 1
status: "draft"
objective: "데이터 분할의 역할을 설명하고 전처리와 샘플 분할에서 Data Leakage를 찾을 수 있다."
prerequisites: ["dl-foundations-15"]
sources:
  - {"book": "d2l", "chapter": "3.6 Generalization", "url": "https://d2l.ai/chapter_linear-regression/generalization.html"}
  - {"book": "deep-learning", "chapter": "5 Machine Learning Basics", "url": "https://www.deeplearningbook.org/contents/ml.html"}
---

## 오늘의 핵심
- **Training Set**은 Parameter 학습, **Validation Set**은 설정과 Model 선택, **Test Set**은 선택이 끝난 뒤 최종 성능 평가에 사용합니다.
- **Data Leakage**는 실제 예측 시 사용할 수 없는 정보가 학습이나 선택 과정에 새어 들어가는 문제입니다. 높은 평가 점수가 실제 성능을 과장하게 만들 수 있습니다.

## 왜 필요한가?
- 시험 문제를 미리 보고 연습한 성적이 새로운 문제를 푸는 능력을 정확히 나타내지 못하듯, 학습에 이용한 데이터로만 평가하면 일반화 성능을 과대평가할 수 있습니다.
- 단순한 파일 분할만으로 충분하지 않습니다. 같은 사람의 기록, 거의 동일한 이미지, 미래 시점의 정보가 분할 경계를 넘어가는지도 확인해야 합니다.

## 작동 원리
- **사용 상황에 맞게 나눕니다.** 새 사람에게 적용할 Model이면 사람 단위 분할을, 미래를 예측할 문제이면 시간 순서를 고려합니다. 무작위 분할이 항상 적절한 것은 아닙니다.
- **학습되는 전처리 통계는 Training Set에서만 구합니다.** 평균·표준편차나 결측값 대체 기준을 먼저 전체 데이터에서 계산하지 않습니다. 정한 변환을 Validation과 Test에 그대로 적용합니다.
- **선택의 횟수도 영향을 줍니다.** Validation 성능을 보며 많은 설정을 시험하면 그 집합에 맞출 수 있습니다. Test를 반복적으로 보며 설정을 바꾸면 더 이상 독립적인 최종 평가가 아닙니다.

## 작은 예제로 확인하기
- 같은 사람의 사진 10장을 장별로 섞어 나누면, Training과 Test에 동일 인물이 함께 들어갈 수 있습니다. “처음 보는 사람”에게 적용하려는 평가라면 사람 단위로 분리해야 합니다.
- 입력을 평균 0으로 바꾸려 할 때는 Training 평균을 계산해 저장합니다. Validation에 다른 평균이 나타나더라도 Validation 자체의 평균으로 다시 맞추면 평가 조건이 달라집니다.
- 실제 운영에서 예측 시점 이후에만 알 수 있는 “최종 처리 결과”를 Feature에 넣었다면, 데이터가 분리돼 있어도 미래 정보가 유출된 것입니다.

## 자주 하는 오해
- **정해진 분할 비율이 모든 문제의 정답은 아닙니다.** 샘플 수, 집단 구조, 시간 변화, 희소한 클래스 등을 고려해야 합니다.
- **Test 성능이 낮을 때 Test에 맞춰 수정한 뒤 같은 점수를 최종 성능으로 보고하면 안 됩니다.** 이미 선택에 사용한 평가라는 사실을 인정하고 독립적인 검증을 다시 설계해야 합니다.

## 복습 질문
- 동일한 기계에서 매초 수집한 센서 기록을 무작위로 섞어 나누면 어떤 Leakage가 생길 수 있을까요?
- Training과 Validation을 나누기 전에 전체 평균으로 표준화하면 왜 문제가 될까요?
