> 개념 알림 신규 구현: [Markdown 기반 36회 과정](CONCEPT_NOTIFICATIONS.md). 대표 3편·검증/미리보기·학기 일정 고정 구현, 월·수·금 09:00 KST. 전체 집필과 승인 전이며 자동 운영은 비활성입니다.

> 현재 주간 HF 상위 3편 파이프라인과 구현 상태: [Cloudflare 주간 알림](CLOUDFLARE_WEEKLY_PIPELINE.md). 아래 이전 운영 설명보다 이 문서를 우선합니다.

> **2026-09-13 현재:** 이전 GAS 운영은 종료되었으며, Cloudflare 기술 검증을 진행 중입니다. 신규 검증 경로와 실행 명령은 [Cloudflare 기술 검증 계획](CLOUDFLARE_TECH_PROBE.md)을 기준으로 합니다. 아래 GAS/Python 운영 설명은 이전 구현의 기록이며 새 운영이 배포 완료되었다는 뜻이 아닙니다.

# Operations — GAS 운영 가이드

## 1. 운영 원칙

- 상시 서버를 기본 전제로 두지 않는다.
- 자동 발행은 **Google Apps Script + Discord Webhook**을 기본값으로 삼는다.
- concept 브리핑은 저장소 markdown 원본을 진실 소스로 본다.
- trend 브리핑은 source 없이 자동 게시하지 않는다.
- 실패 추적은 Apps Script 실행 로그와 Discord 게시 결과를 우선 사용한다.
- 시크릿은 Apps Script Script Properties에만 둔다.

## 2. 설정값 관리

Apps Script `Script Properties`에 아래 값을 저장한다.

필수:
- `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_MAP_JSON`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GITHUB_RAW_BASE_URL`
- `CONCEPT_MANIFEST_PATH`
- `CHANNEL_MAP_PATH`
- `TREND_HISTORY_SHEET_ID`
- `TREND_HISTORY_SHEET_NAME`

## 3. 트리거 운영

### Concept
- 함수: `runConceptDaily`
- 시간: 평일 오전 9시 KST

### Trend
- 함수: `runTrendWeekly`
- 시간: 월요일 오전 9시 KST

권장:
- 모든 수동 검증이 끝난 뒤에만 time trigger를 켠다.

## 4. 로그 전략

### 주요 확인 위치
- Apps Script `Executions`
- 실행 상세 `Logs`

### concept 로그에서 확인할 것
- `runConceptDaily:start`
- `runConceptDaily:success`
- 에러 발생 시 `runConceptDaily:error ...`

### trend 로그에서 확인할 것
- `runTrendWeekly:start`
- `TrendService:enabled_channels count=...`
- `TrendService:channel_start key=...`
- `TrendService:interest_fetch ...`
- `TrendService:interest_fresh ...`
- `OpenAIService:request model=...`
- `OpenAIService:response status=...`
- `TrendService:channel_posted ...`
- 에러 발생 시 `runTrendWeekly:error ...`

## 5. 재시도 정책

### concept 게시 실패
- 문제 원인 수정 후 `runConceptDaily()` 수동 재실행

### trend 게시 실패
- source fetch 실패면 잠시 후 재실행
- OpenAI 실패면 key/model 확인 후 재실행
- webhook mapping 실패면 `DISCORD_WEBHOOK_MAP_JSON` 수정 후 재실행

### fresh source 없음
- Discord에 아무 것도 안 보내질 수 있음
- 이것은 정상 skip일 수 있다
- Google Sheets history와 source fetch 결과를 함께 본다

## 6. 유지보수 포인트

### concept
- `content/concepts/**/*.md` 수정
- `content/concepts/manifest.json` 순서 관리
- concept progress는 Script Properties에서 관리

### trend
- `config/channel_interest_map.json` 수정
- Google Sheets `trend_history` 관리
- taxonomy:
  - `llm`
  - `detection-segmentation`
  - `vision-language`

## 7. 장애 대응 플레이북

### concept가 안 올라옴
1. `runConceptDaily()` 수동 실행
2. `Executions` 로그 확인
3. manifest 경로 확인
4. concept markdown 포맷 확인
5. embed 제한 초과 여부 확인

### trend가 안 올라옴
1. `runTrendWeekly()` 수동 실행
2. `Executions` 로그 확인
3. `DISCORD_WEBHOOK_MAP_JSON` 확인
4. `channel_interest_map.json`의 `enabled`, `webhook_key` 확인
5. source fetch 결과 확인
6. `OPENAI_API_KEY`와 `OPENAI_MODEL` 확인
7. Google Sheets `trend_history` 확인

### 특정 채널만 안 올라옴
1. `channel_interest_map.json`의 `channel_key`, `channel_id`, `webhook_key` 확인
2. 해당 `webhook_key`가 `DISCORD_WEBHOOK_MAP_JSON`에 있는지 확인
3. 해당 채널 interest가 fresh source를 갖는지 확인

## 8. 백업

최소 백업 대상:
- `content/concepts/**/*.md`
- `content/concepts/manifest.json`
- `config/channel_interest_map.json`
- Apps Script 코드 (`apps-script/`)
- Google Sheets `trend_history`
- 운영 문서

## 9. 운영 시작 전 체크리스트

- [ ] `runConceptDaily()` 수동 실행 성공
- [ ] `runTrendWeekly()` 수동 실행 성공
- [ ] Script Properties 설정 완료
- [ ] `channel_interest_map.json` 실제 값 반영 완료
- [ ] `trend_history` 시트 연결 완료
- [ ] concept progress가 Script Properties에서 갱신되는지 확인
- [ ] trend history가 Google Sheets에 기록되는지 확인
- [ ] concept/trend 트리거 시간 설정 완료

## 명시적 일회성 새 형식 발송 검증

`node cloudflare/scripts/preview-live.mjs`는 2026-W37 형식 검증 전용이다.
사용자가 추가 실제 생성·발송을 요청한 경우만 실행한다. 기존 일일 6회와 별도로
최대 3회 추가 호출하며 운영 Worker의 한도·발송 기록을 바꾸지 않는다.
기존 수집 자료와 운영 summarize/renderEdition 코드를 로컬에서 실행한다.
`artifacts/cloudflare/preview-v4-W37`에 호출별 예약·결과·payload·Discord ID를 저장한다.
같은 폴더가 있으면 완료된 결과를 재사용하고 불명확한 호출 및 발송은 반복하지 않는다.
이 폴더는 재발송 방지 기록이므로 재실행을 위해 삭제하지 않는다.
이 테스트는 Cloudflare CPU 한도 또는 자동 예약 실행을 검증하지 않는다.

preview-live.mjs의 기본 실행은 발송하지 않고 preview까지만 생성한다. 검토를 마친
자동 생성 payload를 보낼 때에만 --publish-reviewed를 지정한다. 거절된 생성은 재시도하지
않는다. v4 실제 알림은 별도 payload-reviewed.json과 send-reviewed.mjs로 편집 검토 후
발송했으며 delivery.json 예약 기록을 보존한다.
