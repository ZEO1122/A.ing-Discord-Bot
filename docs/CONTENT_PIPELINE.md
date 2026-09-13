> 개념 알림 신규 구현: [Markdown 기반 36회 과정](CONCEPT_NOTIFICATIONS.md). 36편 초안·검증/미리보기·학기 일정 고정 구현, 월·수·금 09:00 KST. 콘텐츠 최종 승인 전이며 자동 운영은 비활성입니다.

> 학부생 수준에 맞춰 배경과 기존 방식·핵심 방법·실험 결과·이 논문의 핵심 개념 순서로 설명하며 반복을 줄입니다. 세부 규칙과 실발송 기록은 [주간 파이프라인](CLOUDFLARE_WEEKLY_PIPELINE.md)을 참고합니다.

> 출력 문장은 한국어로 쓰되 AI 전문 용어는 원문 영어를 유지합니다. 이모지는 사용하지 않습니다.

> 최신 형식은 v3 설명형 임베드입니다. 세 줄 요약·배경·방법·결과·개념·연구 한계·출처를 사용하며 자료 범위 표시를 제거했습니다. 결과/연구 한계는 근거가 있는 경우만 표시합니다. JSON schema_version=3, background/results 추가, 테이블 변경 없음. [상세](CLOUDFLARE_WEEKLY_PIPELINE.md#설명형-임베드-v3)

> 2026-09-13 임베드 개편: 순위를 유지한 월·주차 제목과 세로형 6개 필드를 사용합니다. 신규 요약 JSON은 `schema_version: 2` 및 `differences`, `prerequisites`를 포함합니다. 기존 JSON과 발송 이력은 보존하며 테이블 변경은 없습니다. 상세는 [주간 파이프라인](CLOUDFLARE_WEEKLY_PIPELINE.md#임베드-개편-v2)을 참고합니다.

> 현재 주간 HF 상위 3편 파이프라인과 구현 상태: [Cloudflare 주간 알림](CLOUDFLARE_WEEKLY_PIPELINE.md). 아래 이전 운영 설명보다 이 문서를 우선합니다.

# Content Pipeline — 브리핑과 퀴즈 생성 파이프라인

## 1. 목표

콘텐츠 파이프라인의 목적은 “최근 동향 + 초보자용 설명 + 채점 가능한 퀴즈”를 안정적으로 생산하는 것이다.

이 파이프라인은 아래 세 가지 결과물을 만든다.

1. 공개용 브리핑
2. 토론용 질문
3. 채점용 퀴즈

## 2. 콘텐츠 종류

### 2.1 Concept
- 예: CNN, Attention, Fine-tuning, Contrastive Learning
- 설명 중심
- 비교적 안정적인 개념

### 2.2 Trend
- 예: 최근 NLP 평가 방식 변화, 멀티모달 파운데이션 모델 동향
- 최근성 중요
- 출처와 날짜가 중요

### 2.3 Paper Brief
- 특정 논문/학회 발표를 읽기 쉽게 요약
- 브리핑 + 핵심 용어 + 퀴즈 구성

## 3. 트랙 설계

초기 트랙 예시:
- `dl-basics`
- `nlp`
- `cv`
- `multimodal`
- `affective-computing`
- `paper-of-the-day`

## 4. 생성 단계

```text
1. 후보 수집
2. 출처 정규화
3. 주제 선택
4. 브리핑 초안 생성
5. 퀴즈 초안 생성
6. 중복 검사
7. 필수 필드 검사
8. 운영진 검수 또는 자동 승인
9. 게시
```

## 5. 수집 규칙

### 원칙
- 최근 동향은 출처 없는 생성 금지
- 개념 설명은 보강 설명이 가능하되, 최근성 주장에는 출처 필요
- 일반 산업 뉴스로 과도하게 흐르지 않도록 트랙 목적을 명확히 제한

### 수집 결과에서 저장해야 할 최소 필드
- `title`
- `url`
- `published_at`
- `source_type`
- `normalized_key`

## 6. 생성 결과 스키마

권장 스키마 예시:

```json
{
  "content_id": "2026-03-26-nlp-001",
  "track": "llm",
  "mode": "trend",
  "title": "....",
  "one_line": "....",
  "what_happened": "....",
  "why_it_matters": "....",
  "easy_terms": [
    "Transformer (트랜스포머): ...",
    "Benchmark (벤치마크): ...",
    "Fine-tuning (미세조정): ..."
  ],
  "discussion_prompt": "....",
  "quiz": {
    "quiz_type": "mcq",
    "question": "....",
    "choices": ["A", "B", "C", "D"],
    "answer_key": [1],
    "accepted_keywords": [],
    "hint": "....",
    "explanation": "...."
  },
  "sources": [
    {
      "title": "....",
      "url": "....",
      "published_at": "2026-03-25",
      "source_type": "paper"
    }
  ]
}
```

## 7. 현재 스크립트 초안과 연결하는 방법

현재 웹훅 기반 초안은 **생성기 프로토타입**으로 유지할 수 있다.  
다만 아래를 보완해야 한다.

### 보완 1 — `question` 분리
현재 `question` 필드는 토론용으로는 적합하지만, 채점형 퀴즈 구조가 아니다.  
따라서 다음처럼 분리한다.

- `discussion_prompt`
- `quiz.question`

### 보완 2 — `sources` 정규화
렌더링용 문자열 배열이 아니라 객체 배열로 저장한다.

### 보완 3 — 중복 검사를 일반화
특정 트랙 전용 `is_duplicate_affective` 같은 구조 대신 일반 키를 쓴다.

권장 키:
- `track`
- `normalized_topic`
- `normalized_source_url`
- `published_at`

### 보완 4 — 정답/해설 필드 추가
MVP부터 아래가 필요하다.
- `quiz_type`
- `answer_key`
- `hint`
- `explanation`

## 8. 품질 규칙

### 브리핑 품질
- 초보자도 읽을 수 있어야 함
- 1~2분 안에 핵심 파악 가능
- 왜 중요한가가 빠지면 안 됨

### 퀴즈 품질
- 정답 판정이 명확해야 함
- 보기 간 함정이 과도하지 않아야 함
- 해설은 짧고 학습적이어야 함

### 출처 품질
- 최근 동향이면 날짜가 중요
- 링크가 실제 문서로 이어져야 함
- 제목/날짜/URL 파싱 실패 시 관리자 검수 필요

## 9. 중복 제거 전략

### 브리핑 중복
다음 중 하나라도 겹치면 중복 후보로 본다.
- 같은 source URL
- 같은 canonical paper id
- 같은 제목 정규화 결과
- 같은 주제 + 매우 가까운 날짜

### 퀴즈 중복
- 같은 주제에서 같은 정답 포인트를 반복하지 않도록 관리
- 사용자 체감상 비슷한 문제는 일정 기간 재노출 제한

## 10. 검수 플로우

### 자동 승인 가능
- 출처 있음
- 필수 필드 완비
- 금지 키워드 없음
- 중복 아님

### 수동 승인 필요
- 출처 없음
- 최근성 불명확
- 난이도 과도
- 정답이 애매함
- 요약이 산업 뉴스로 흐름

## 11. 게시 정책 예시

### 일간 정책
- 월: DL Basics
- 화: NLP
- 수: CV
- 목: Multimodal / Affective
- 금: Paper Brief
- 주말: 오답노트/복습

## 12. 파이프라인 체크리스트

- [ ] source 후보 수집
- [ ] 필수 메타데이터 확보
- [ ] 브리핑 생성
- [ ] 퀴즈 생성
- [ ] 중복 검사
- [ ] 스키마 검증
- [ ] 검수 통과
- [ ] 게시 대기열 등록
