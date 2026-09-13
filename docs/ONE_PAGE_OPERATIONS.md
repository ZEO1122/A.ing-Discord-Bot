# One-Page Operations

이 문서는 이 저장소를 처음 맡는 운영자가 **바로 따라할 수 있도록** 핵심 절차만 1페이지로 요약한 문서다.

## 1. 이 프로젝트가 하는 일

- 평일 오전 9시 KST: concept 브리핑 1개 자동 게시
- 월요일 오전 9시 KST: 채널별 관심분야에 맞는 trend 브리핑 자동 게시
- 실행 방식: **Google Apps Script + Discord Webhook**

## 2. 먼저 확인할 파일

- 서버 연결: `docs/SERVER_SETUP_GUIDE.md`
- 유지보수: `docs/MAINTENANCE_GUIDE.md`
- 장애 대응: `docs/OPERATIONS.md`
- concept 순서: `content/concepts/manifest.json`
- concept 진행 상태: Script Properties
- 채널별 관심분야: `config/channel_interest_map.json`
- trend 중복 방지 이력: Google Sheets `trend_history`

## 3. Apps Script 설정값

반드시 있어야 하는 값:
- `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_MAP_JSON`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GITHUB_RAW_BASE_URL`
- `CONCEPT_MANIFEST_PATH`
- `CHANNEL_MAP_PATH`
- `TREND_HISTORY_SHEET_ID`
- `TREND_HISTORY_SHEET_NAME`

## 4. concept 운영 방법

### concept 추가
1. `content/concepts/dl-basics/`에 새 `.md` 파일 추가
2. `content/concepts/manifest.json` 마지막에 경로 추가
3. `clasp push`

### concept 수동 테스트
- Apps Script에서 `runConceptDaily()` 실행

정상 결과:
- Discord에 concept full embed 게시
- Script Properties progress 갱신

## 5. trend 운영 방법

### 채널 설정 변경
1. `config/channel_interest_map.json` 수정
2. 운영할 채널은 `enabled: true`
3. `interests`는 `llm`, `detection-segmentation`, `vision-language` 안에서 설정
4. `max_topics` 조정
5. `clasp push`

### trend 수동 테스트
- Apps Script에서 `runTrendWeekly()` 실행

정상 결과:
- 해당 채널에 weekly trend 브리핑 게시
- Google Sheets `trend_history` 갱신

주의:
- fresh source가 없으면 메시지 없이 skip될 수 있다

## 6. 자주 보는 에러

### concept가 안 올라옴
- `runConceptDaily()` 실행 로그 확인
- markdown 포맷 확인
- Script Properties progress 갱신 확인
- embed 제한 초과 확인

### trend가 안 올라옴
- `OPENAI_API_KEY` 확인
- `DISCORD_WEBHOOK_MAP_JSON` 확인
- `channel_interest_map.json`의 `webhook_key`와 설정값 일치 확인
- fresh source 부족이면 skip 가능

## 7. 운영 시작 전 마지막 확인

- [ ] concept 수동 실행 성공
- [ ] trend 채널별 수동 실행 성공 또는 의도된 skip 확인
- [ ] GAS 트리거 시간이 concept=평일 9시, trend=월요일 9시 KST로 맞음
- [ ] 새 concept를 추가하면 `manifest.json`도 같이 수정함
- [ ] 채널/관심분야 변경 시 `channel_interest_map.json`도 같이 수정함

## 8. 운영자용 한 줄 요약

- concept는 `manifest.json`만 보면 된다
- trend는 `channel_interest_map.json`만 보면 된다
- 문제 생기면 먼저 Apps Script `Executions` 로그부터 본다
