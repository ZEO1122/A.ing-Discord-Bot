# Maintenance Guide

이 문서는 운영 중인 Discord 브리핑 자동화를 유지보수하는 방법을 정리한다.

## 1. 유지보수 범위

주요 유지보수 대상:
1. concept 콘텐츠
2. trend 채널/관심분야 설정
3. Apps Script 설정값 및 webhook
4. Apps Script 실행 결과

## 2. concept 콘텐츠 유지보수

관련 파일:
- `content/concepts/dl-basics/*.md`
- `content/concepts/manifest.json`

### 새 concept 추가 절차
1. 새 `.md` 파일 작성
2. 기존 concept 포맷과 동일한 frontmatter/섹션 구조 유지
3. `manifest.json` 마지막에 새 파일 경로 추가
4. `clasp push`
5. `runConceptDaily()` 수동 검증

### 수정 시 체크 포인트
- title / one_line이 명확한가
- 섹션 수가 과도하지 않은가
- 각 섹션이 embed field 1024자 이하인가
- 전체 field 수가 25개 이하인가
- source / 주의 섹션이 빠지지 않았는가

## 3. trend 유지보수

관련 파일:
- `config/channel_interest_map.json`

### 채널별 관심분야 변경
1. `channel_interest_map.json` 수정
2. `interests` 변경 (`llm`, `detection-segmentation`, `vision-language` 기준)
3. 필요하면 `max_topics` 조정
4. `clasp push`
5. `runTrendWeekly()` 수동 검증

### history 관리
- trend history는 Google Sheets `trend_history`에 저장한다.
- fresh source가 없으면 게시 없이 skip될 수 있다.
- 필요 시 특정 채널/분야 row를 지워서 재테스트할 수 있다.

## 4. Apps Script 설정값 유지보수

필수 설정값:
- `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_MAP_JSON`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GITHUB_RAW_BASE_URL`
- `CONCEPT_MANIFEST_PATH`
- `CHANNEL_MAP_PATH`
- `TREND_HISTORY_SHEET_ID`
- `TREND_HISTORY_SHEET_NAME`

### 교체가 필요한 경우
- webhook URL이 바뀜
- OpenAI key가 바뀜
- concept/trend 채널을 새로 연결함
- GitHub 저장소 주소 또는 branch 구조가 바뀜

### 교체 절차
1. Discord 채널에서 새 webhook 생성
2. Apps Script `Script Properties` 값 교체
3. 필요 시 Google Sheets 설정 확인
4. `runConceptDaily()` / `runTrendWeekly()` 수동 검증

## 5. GAS 트리거 유지보수

### concept trigger 운영 확인
- 평일 오전 9시 KST에 `runConceptDaily()`가 실행되는가
- concept 게시 성공 후 Script Properties progress가 갱신되는가

### trend trigger 운영 확인
- 월요일 오전 9시 KST에 `runTrendWeekly()`가 실행되는가
- 채널별 관심분야를 읽는가
- Google Sheets `trend_history`가 갱신되는가

## 6. 운영자가 자주 보는 파일

- `README.md`
- `docs/OPERATIONS.md`
- `config/channel_interest_map.json`
- `content/concepts/manifest.json`
- `apps-script/ConfigService.gs`
- `apps-script/ConceptService.gs`
- `apps-script/TrendService.gs`

## 7. 장애 대응 요약

### concept가 안 올라옴
- `runConceptDaily()` 실행 기록 확인
- markdown 포맷 확인
- Script Properties concept progress 갱신 확인
- embed 제한 초과 여부 확인

### trend가 안 올라옴
- `runTrendWeekly()` 실행 기록 확인
- `OPENAI_API_KEY` 확인
- `DISCORD_WEBHOOK_MAP_JSON` 확인
- source fetch 성공 여부 확인
- Google Sheets `trend_history` 확인

### 특정 채널만 안 올라옴
- `channel_interest_map.json`의 `enabled` 확인
- `webhook_key`와 Script Properties key 일치 여부 확인
- 관심분야 source가 실제로 fresh인지 확인

## 8. 운영 변경 권장 방식

권장:
- 작은 변경은 PR로 검토 후 반영
- 큰 변경은 GAS 수동 실행으로 먼저 테스트
- 채널 매핑/manifest 변경은 commit message에 이유를 명확히 남기기

## 9. 최소 운영 체크리스트

- [ ] concept 신규 파일 추가 시 `manifest.json`도 수정했는가
- [ ] 채널/관심분야 변경 시 `channel_interest_map.json`을 수정했는가
- [ ] Script Properties 변경 후 수동 실행으로 검증했는가
- [ ] failed가 아니라 skip인 경우 정상 skip인지 확인했는가
- [ ] Apps Script trigger 시간이 실제 운영 시간과 맞는가
