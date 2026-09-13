# GAS Setup Guide

## 목적

이 문서는 Google Apps Script 기반 Discord 브리핑 자동화를 처음 설정하는 운영자를 위한 안내서다.

## 1. 준비물

- Google 계정
- GitHub public 저장소
- Discord webhook
- OpenAI API key
- Google Sheets 1개

## 2. Apps Script 프로젝트 생성

1. `https://script.google.com` 접속
2. 새 프로젝트 생성
3. 프로젝트 이름 예시:
   - `Discord Brief Automation`

## 3. Script Properties 설정

Apps Script 편집기에서:
- `프로젝트 설정`
- `스크립트 속성`

추가할 값:

- `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_MAP_JSON`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GITHUB_RAW_BASE_URL`
- `CONCEPT_MANIFEST_PATH`
- `CHANNEL_MAP_PATH`
- `TREND_HISTORY_SHEET_ID`
- `TREND_HISTORY_SHEET_NAME`

예시:

```text
OPENAI_MODEL=gpt-5.1
GITHUB_RAW_BASE_URL=https://raw.githubusercontent.com/<OWNER>/<REPO>/main
CONCEPT_MANIFEST_PATH=content/concepts/manifest.json
CHANNEL_MAP_PATH=config/channel_interest_map.json
TREND_HISTORY_SHEET_NAME=trend_history
```

## 4. Google Sheets 준비

새 Google Sheet 생성

추천 이름:
- `discord-brief-history`

시트 탭 이름:
- `trend_history`

헤더:

```text
channel_key | channel_id | interest | source_url | source_title | published_at | posted_at | brief_title
```

## 5. GitHub raw 접근 전제

이 설계는 GitHub public repo를 전제로 한다.

Apps Script가 읽는 핵심 파일:
- `content/concepts/manifest.json`
- `content/concepts/**/*.md`
- `config/channel_interest_map.json`

## 6. Concept 수동 실행

Apps Script에서 아래 함수를 실행한다.

- `runConceptDaily()`

기대 결과:
- concept 1건 게시
- Script Properties progress 갱신

## 7. Trend 수동 실행

Apps Script에서 아래 함수를 실행한다.

- `runTrendWeekly()`

기대 결과:
- 채널별 trend 브리핑 게시
- Google Sheets history 기록

## 8. 시간 기반 트리거

### concept
- 함수: `runConceptDaily`
- 주기: 평일 오전 9시 KST

### trend
- 함수: `runTrendWeekly`
- 주기: 매주 월요일 오전 9시 KST

## 9. 운영 전 체크

- GitHub raw URL 접근 가능
- concept markdown 포맷 정상
- channel map 정상
- Discord webhook 정상
- OpenAI key 정상
- concept/trend 수동 실행 성공
