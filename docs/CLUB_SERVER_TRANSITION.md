# Club Server Transition Checklist

이 문서는 개인 테스트 서버에서 동아리 운영 서버로 전환할 때 무엇을 **유지**하고 무엇을 **초기화(reset)** 해야 하는지 정리한다.

## 1. 전환 원칙

- 코드와 GAS 구조는 그대로 유지한다.
- Discord webhook, 채널 ID, 운영 history는 동아리 서버 기준으로 교체하거나 초기화한다.

## 2. 그대로 유지해도 되는 파일

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/OPERATIONS.md`
- `docs/SERVER_SETUP_GUIDE.md`
- `docs/MAINTENANCE_GUIDE.md`
- `docs/ONE_PAGE_OPERATIONS.md`
- `apps-script/*.gs`
- `content/concepts/**/*.md`
- `content/concepts/manifest.json`

## 3. 동아리 서버 기준으로 교체해야 하는 항목

### 3.1 Apps Script Script Properties

반드시 교체 또는 재확인:
- `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_MAP_JSON`
- `OPENAI_API_KEY`
- `TREND_HISTORY_SHEET_ID`
- `TREND_HISTORY_SHEET_NAME`

### 3.2 채널 매핑 파일

파일:
- `config/channel_interest_map.json`

반드시 수정:
- `channel_id`
- `webhook_key`
- `enabled`
- `interests`

## 4. reset을 권장하는 항목

### 4.1 concept 진행 상태
- 저장 위치: Script Properties
- 처음부터 다시 보내고 싶으면 reset

### 4.2 trend 게시 history
- 저장 위치: Google Sheets
- 개인 서버 테스트 흔적을 없애고 싶으면 Sheet의 관련 row 정리

## 5. 전환 절차

1. `config/channel_interest_map.json`을 동아리 서버 기준으로 수정
2. Apps Script `Script Properties`를 동아리 서버 기준으로 교체
3. taxonomy를 아래 3개로 맞춘다.
   - `llm`
   - `detection-segmentation`
   - `vision-language`
4. concept progress reset 여부 결정
5. trend history Sheet 정리 여부 결정
6. `runConceptDaily()` 수동 실행
7. `runTrendWeekly()` 수동 실행
8. 결과가 맞으면 time trigger 운영 시작

## 6. 전환 전 최종 점검

- [ ] `channel_interest_map.json`이 동아리 서버 채널 ID로 바뀌었다
- [ ] `DISCORD_WEBHOOK_URL`이 동아리 concept 채널 webhook로 교체됐다
- [ ] `DISCORD_WEBHOOK_MAP_JSON`이 동아리 trend 채널 webhook 맵으로 교체됐다
- [ ] `llm`, `detection-segmentation`, `vision-language` taxonomy 기준으로 채널 관심분야를 정리했다
- [ ] concept를 처음부터 보낼지 결정했고, 필요하면 Script Properties progress를 reset했다
- [ ] trend history를 새로 시작할지 결정했고, 필요하면 Google Sheets를 정리했다
- [ ] concept 수동 실행 성공
- [ ] trend 채널별 수동 실행 성공 또는 정상 skip 확인
