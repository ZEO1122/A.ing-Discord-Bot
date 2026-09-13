# GAS Operating Plan

## 목적

이 문서는 Discord 브리핑 자동화의 현재 GAS 운영 구조를 요약한다.

## 기본 구조

```text
GitHub Public Repo
  ├─ content/concepts/*.md
  ├─ content/concepts/manifest.json
  └─ config/channel_interest_map.json

Google Apps Script
  ├─ runConceptDaily()
  ├─ runTrendWeekly()
  ├─ GitHub raw fetch
  ├─ Discord webhook send
  ├─ OpenAI generate
  ├─ Script Properties
  └─ Google Sheets history
```

## 상태 저장 전략

### Concept progress
- 저장 위치: Script Properties
- 키 예시:
  - `CONCEPT_LAST_INDEX`
  - `CONCEPT_LAST_PATH`
  - `CONCEPT_LAST_BRIEFING_KEY`
  - `CONCEPT_LAST_POSTED_AT`

### Trend history
- 저장 위치: Google Sheets
- 시트 이름: `trend_history`
- 컬럼:
  - `channel_key`
  - `channel_id`
  - `interest`
  - `source_url`
  - `source_title`
  - `published_at`
  - `posted_at`
  - `brief_title`

## 운영 기준

- concept: 평일 오전 9시 KST
- trend: 월요일 오전 9시 KST

## 핵심 원칙

- concept는 GitHub raw에서 읽어온다.
- trend는 GAS가 직접 source를 수집한다.
- GitHub는 source-of-truth 저장소로 유지한다.
- GAS는 예약 실행기 역할을 맡긴다.

## 검증 기준

### concept
- 다음 concept 1개를 정상 게시
- Script Properties progress 증가

### trend
- 채널별 관심분야 브리핑 게시
- Google Sheets history 기록
- fresh source 없으면 skip
