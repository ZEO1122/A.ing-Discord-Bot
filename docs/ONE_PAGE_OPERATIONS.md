# 한 장 운영 안내

확인일: 2026-09-13. 새 담당자가 먼저 읽는 문서다.

## 지금 상태

- Cloudflare Worker + Workflows + D1으로 운영한다. GAS·상시 서버·GitHub Actions는 현재 실행 경로가 아니다.
- 뉴스: HF 주간 상위 3편 → OpenAI 요약 → 뉴스 Discord 채널.
- 개념: Markdown 36편 → 정적 빌드 → 개념 Discord 채널. 발송 시 API 비용 없음.
- 모든 발송·예약 게이트 false, cron 없음. 36편 draft, 학기 시작일 미정.

## 할 일별 문서

| 할 일 | 읽을 문서 |
| --- | --- |
| 개인 계정에서 동아리 계정으로 이전 | [계정 이전](ACCOUNT_MIGRATION.md) |
| 글·그림·일정·모델 수정 | [유지보수](MAINTENANCE_GUIDE.md) |
| 알림 실패·중복·DB 복구 | [운영·장애 대응](OPERATIONS.md) |
| 개념 원고 규칙 | [개념 알림 규격](CONCEPT_NOTIFICATIONS.md) |
| 뉴스 생성·발송 규칙 | [주간 파이프라인](CLOUDFLARE_WEEKLY_PIPELINE.md) |

## 수정 후 기본 확인

```bash
npm ci
npm run content:validate
npm run content:test
npm run content:examples
npm run content:preview
npm run content:build
npm run cf:typecheck
npm run cf:test
npm run cf:build
```

미리보기: `artifacts/concepts/preview.html`. Git push와 Worker 배포는 별도다. 실제 배포는 계정·변경 내용을 확인한 뒤 `npm run cf:deploy`. 운영 시작은 전체 검수와 일정 활성화 검증이 추가로 필요하다.

## 꼭 기억할 것

- `.env`, Webhook, 관리자 토큰, API 키, DB 백업을 GitHub·Notion에 넣지 않는다.
- 뉴스는 `DISCORD_WEBHOOK_URL`, 개념은 `CONCEPT_WEBHOOK_URL`을 사용한다.
- `--generate`는 유료 생성, `--publish`와 `--send`는 실제 발송이다.
- `unknown` 기록을 지우고 재발송하지 않는다. Discord 메시지를 먼저 확인한다.
- 예시 학기 날짜를 그대로 활성화하지 않는다.
- 과거 old origin의 이력·태그를 새 공개 저장소에 push하지 않는다.

## 인수인계 완료 체크

- [ ] 정·부 담당자가 각 서비스에 독립적으로 로그인한다.
- [ ] 문서대로 로컬 검증과 미리보기를 실행했다.
- [ ] 두 채널·Secrets의 이름·비밀 보관 위치를 확인했다.
- [ ] 테스트 DB 복구 절차를 이해했다.
- [ ] 비용 확인과 장애 대응 담당자를 정했다.
- [ ] GitHub 변경을 Notion에도 반영하고 기준 날짜를 갱신했다.
