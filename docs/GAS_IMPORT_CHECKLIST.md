# GAS Import Checklist

이 문서는 Google Apps Script 프로젝트를 실제로 만들고, 이 저장소의 `apps-script/` 파일을 어떤 순서로 넣어야 하는지 정리한 실무용 체크리스트다.

## 1. 시작 전 준비

- Google 계정
- Discord webhook 준비
- OpenAI API key 준비
- GitHub public 저장소 URL 확인
- Google Sheets 1개 생성

권장 참조 문서:
- `docs/GAS_MIGRATION_PLAN.md`
- `docs/GAS_SETUP_GUIDE.md`

## 2. Apps Script 프로젝트 생성

1. `https://script.google.com` 접속
2. 새 프로젝트 생성
3. 프로젝트 이름 지정
   - 예: `Discord Brief Automation`

## 3. 가장 먼저 넣을 파일

아래 순서대로 붙여넣는 것을 권장한다.

### Step 1. `appsscript.json`

로컬 파일:

- `apps-script/appsscript.json`

역할:
- 타임존/런타임 기본 설정

### Step 2. `ConfigService.gs`

로컬 파일:

- `apps-script/ConfigService.gs`

역할:
- Script Properties 읽기
- 기본 설정값 접근

### Step 3. `GitHubService.gs`

로컬 파일:

- `apps-script/GitHubService.gs`

역할:
- GitHub public raw 파일 읽기

### Step 4. `Utils.gs`

로컬 파일:

- `apps-script/Utils.gs`

역할:
- frontmatter 파싱
- 섹션 파싱
- URL 정규화

### Step 5. `DiscordService.gs`

로컬 파일:

- `apps-script/DiscordService.gs`

역할:
- Discord webhook 전송

### Step 6. `HistoryService.gs`

로컬 파일:

- `apps-script/HistoryService.gs`

역할:
- concept progress 저장
- trend history 시트 기록

### Step 7. `OpenAIService.gs`

로컬 파일:

- `apps-script/OpenAIService.gs`

역할:
- OpenAI Responses API 호출

### Step 8. `ConceptService.gs`

로컬 파일:

- `apps-script/ConceptService.gs`

역할:
- concept daily 게시 로직

### Step 9. `TrendService.gs`

로컬 파일:

- `apps-script/TrendService.gs`

역할:
- trend weekly 게시 로직

### Step 10. `Code.gs`

로컬 파일:

- `apps-script/Code.gs`

역할:
- 트리거 엔트리포인트
  - `runConceptDaily()`
  - `runTrendWeekly()`

## 4. Script Properties 입력

Apps Script 편집기에서:

- `프로젝트 설정`
- `스크립트 속성`

반드시 넣어야 하는 값:

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

## 5. Google Sheets 준비

추천 시트 이름:

- 문서 이름: `discord-brief-history`
- 탭 이름: `trend_history`

헤더:

```text
channel_key | channel_id | interest | source_url | source_title | published_at | posted_at | brief_title
```

시트 ID를 Script Properties에 넣는다.

## 6. 첫 번째 검증 순서

### Concept 검증

Apps Script에서 직접 실행:

- `runConceptDaily()`

확인할 것:
- Discord concept 채널에 게시되는지
- Script Properties progress가 생기는지

### Trend 검증

Apps Script에서 직접 실행:

- `runTrendWeekly()`

확인할 것:
- 각 trend 채널에 게시되는지
- Google Sheets에 history row가 생기는지

## 7. time trigger 설정 순서

모든 수동 검증이 끝난 뒤에만 설정한다.

### Concept
- 함수: `runConceptDaily`
- 시간: 평일 오전 9시 KST

### Trend
- 함수: `runTrendWeekly`
- 시간: 월요일 오전 9시 KST

## 8. 붙여넣기 우선순위 한 줄 요약

`ConfigService -> GitHubService -> Utils -> DiscordService -> HistoryService -> OpenAIService -> ConceptService -> TrendService -> Code.gs`
