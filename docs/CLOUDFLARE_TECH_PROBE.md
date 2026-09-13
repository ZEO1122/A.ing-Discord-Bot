> 이 문서의 v1/v2 결과는 초기 검증 기록입니다. v3의 상위 3편 성공, 초록 대체와 발행 검증은 [주간 파이프라인 현황](CLOUDFLARE_WEEKLY_PIPELINE.md)을 참조하세요. Workers Free는 사용자가 확인했습니다.

# Cloudflare 기술 검증 — 2026-09-13

## 목적과 범위

상시 서버·GAS·GitHub Actions 없이 운영 가능한지 확인하는 첫 단계다.
실제 논문 1~3편의 공개 메타데이터와 HTML 본문 일부를 읽고, OpenAI로 근거가 붙은
한국어 초안을 만들고 D1에 저장한다. 주간 순위 선정, 학기 일정, Discord 발행,
외부 예약 점검은 다음 단계다. **현재 Worker에는 cron과 Discord 전송 코드가 없다.**

## 검증 순서

1. 타입 검사와 Workers 런타임 통합 테스트.
2. 로컬 workerd + 지속되는 D1/Workflow에서 실제 논문·API 호출.
3. 무료 Cloudflare 계정에 격리된 probe D1/Worker/Workflow 배포.
4. 같은 논문으로 원격 실행, CPU·실행 결과·D1 보관 확인.
5. 중복 실행과 실패 복구 확인 후 다음 단계 여부 결정.

실패하거나 미확인인 항목을 성공으로 표시하지 않는다. 로컬 elapsed_ms는 벽시계
시간이며 CPU 측정값이 아니다. 무료 CPU 제한은 원격 telemetry에서 별도 확인한다.

## 구조

- `cloudflare/src/index.ts`: 인증된 POST `/probes`, GET `/probes/:id`, PaperProbe Workflow.
- `sources.ts`: Hugging Face 메타데이터 + arXiv HTML의 `article p.ltx_p` 문단 추출.
- `openai.ts`: Responses API 구조화 출력, 근거 문단의 정확한 인용 검증.
- `repository.ts`: D1 호출 예약·캐시·작업 상태.
- `scripts/probe.mjs`: 로컬 동일 실행 코드 또는 원격 Worker 호출과 결과 보고서 저장.

관리 토큰 없이 모든 HTTP 경로는 401이다. 테스트 서버도 공개 자료 API를 마음대로
호출하는 프록시가 되지 않도록 논문 ID만 허용하고 URL은 코드에서 조합한다.
소스/모델 응답은 비신뢰 데이터다. 모델은 툴·웹훅·Secrets에 접근하지 않는다.

## 입력·비용 상한

- 1개 요청에 논문 ID 1~3개; 중복 제거·정렬 후 코드 버전과 모델을 포함해 작업 ID 생성.
- 동일 작업은 재제출해도 다시 생성하지 않는다. D1 이력은 Workflow 보관 만료 이후에도 남는다.
- 메타데이터 최대 128KB, HTML 최대 1.5MB, 문단 발췌 최대 12,000자.
- 초록만 있거나 본문 파싱 실패 시 차단. PDF/OCR 및 본문 전체 분석은 미구현.
- 요약은 최대 1,200 출력 토큰, 기본 모델 `gpt-4.1-mini-2025-04-14`.
- D1 하나당 UTC 하루 6회 호출 예약. 성공/실패/결과 불명확 모두 예약을 소비한다.
- 이 상한은 계정 전체 OpenAI 달러 예산이 아니다. DB 초기화/새 DB 생성으로 리셋될 수 있다.
- API 자동 재시도는 0회다. 응답이 불명확하면 과금 여부를 추정하지 않고 보류한다.
- 소스 조회 단계만 최대 2회 재시도한다. 결과는 항상 `needs_review: true`이다.

인용 일치 검사는 근거 추적만 보장한다. 요약의 논리적 타당성이나 논문의 과학적
정확성까지 검증하지 않는다. 초기 발췌는 앞부분에 치우치므로 전체 실험·한계 분석에
사용할 수 없다. 다음 단계에서 절별 선택과 교차 검수가 필요하다.

## D1 스키마

기존 PostgreSQL/SQLAlchemy 스키마와 별개인 격리 POC DB다.

| 테이블 | 키·목적 |
|---|---|
| probe_jobs | id PK, 요청 JSON, queued/running/complete/blocked/dispatch_unknown, 오류 코드·시각 |
| probe_sources | (job_id,paper_id) PK, 구조화된 출처·본문 발췌 |
| probe_calls | (job_id,paper_id) PK, in_flight/complete/unknown/rejected, 결과·usage·시각 |

API 전에는 단일 SQL로 호출을 예약한다. 다른 프로세스가 같은 호출을 선점했거나
이미 불명확한 상태라면 재호출하지 않는다. 완료 결과는 캐시에서 재사용한다.
Workflow 시작 요청의 응답이 불명확하면 `dispatch_unknown`; GET으로만 확인하고
무조건 새 작업을 생성하지 않는다. `--resume`은 blocked이면서 API 예약이 0건인
작업만 `/probes/:id/retry-sources`로 재시작한다. 유료 호출이 있는 작업에는 409를
반환한다. 동일 배치의 중복 방지이며, 다른 배치에 같은 논문을 넣는 경우의 전역
중복 방지는 아직 없다.

## 로컬 실행

레포 루트, Node 24 기준:

```bash
npm ci
npm run cf:typecheck
npm run cf:test
npm run cf:build
node cloudflare/scripts/check-persistence.mjs
npm run cf:probe -- --ids 2609.09143,2609.10745,2609.10445
```

`cf:test`는 실제 네트워크를 막은 Workers/D1 통합 테스트다.
`cf:probe`는 루트의 무시된 `.env`에서 `OPENAI_API_KEY`를 메모리로만 읽는다.
키를 빌드나 설정 파일에 복사하지 않는다. 로컬 관리 토큰은 실행 때 메모리에서 생성한다.
로컬 DB와 Workflow는 `cloudflare/.wrangler/probe-state/`에 유지된다.
Miniflare 5의 `resourcePersistencePath`를 명시하며, 별도 가짜 데이터 테스트로
런타임 종료·재시작 후 D1 보존을 확인한다. Miniflare는 현재 alpha 버전을 lockfile에 고정했다.
보고서는 무시된 `artifacts/cloudflare/{local|remote}-<job-id>.json`에 저장한다.
이 디렉터리를 삭제하면 중복 방지/일일 호출 이력도 사라지므로 재실행 목적으로 삭제하지 않는다.

## 원격 배포 준비

1. `npx wrangler login` — 사용자 브라우저 인증.
2. `npx wrangler d1 create discord-study-probe` 후 반환된 DB ID를 wrangler.jsonc에 반영.
3. `npx wrangler d1 migrations apply discord-study-probe --remote --config cloudflare/wrangler.jsonc`
4. `npm run cf:secrets`로 `OPENAI_API_KEY`, `ADMIN_TOKEN`을 Cloudflare Secrets에 저장.
5. 원격 검증할 때만 `LIVE_ENABLED`를 true로 설정하고 로컬에서 배포.
6. 위 스크립트가 생성한 `cloudflare/.wrangler/admin-token`을 CLI에서 사용한다.
   필요하면 `.env`의 `PROBE_ADMIN_TOKEN`으로 재정의한 후:

```bash
npm run cf:probe -- --remote https://<worker>.<account>.workers.dev --ids 2609.09143,2609.10745,2609.10445
```

Secrets는 채팅·명령 인수에 붙여넣지 않는다. 원격 검증 후 LIVE_ENABLED를 false로
돌려 추가 생성은 막고 인증된 조회는 유지한다. 유료 플랜 변경은 하지 않는다.

## 실측 결과 — 2026-09-13

Worker/Workflow `discord-study-probe`와 격리된 D1을 배포했다. 사용자가 승인한
Secrets 저장을 완료했고, 검증 종료 후 `LIVE_ENABLED=false`로 재배포했다.
유료 플랜으로 전환하지 않았으며, 실제 계정의 요금제는 OAuth 조회 권한 부족으로
대시보드 확인을 요청한 상태다.
종료 상태를 원격에서 확인했다: 신규 작업 403(`live_disabled`), 비인증 401,
인증된 기존 결과 조회 200. Discord 발행과 cron은 활성화하지 않았다.

| 검증 논문 | 원격 결과 | 확인된 토큰 사용량 |
|---|---|---|
| 2609.09143 | HTML 387,582바이트, 근거 검증 통과, 요약·출처·usage D1 저장 | 입력 2,752 / 출력 772 |
| 2609.10445 | 본문 응답 1.5MB 상한 초과, API 호출 전 차단 | 호출 없음 |
| 2609.10745 | 모델 인용이 원문과 불일치하여 rejected, usage 보존 | 입력 2,937 / 출력 690 |

위 표는 `probe-v2` 결과다. 수정 전 로컬 1회·원격 1회는 인용 길이 검증 실패로
차단됐지만 usage를 저장하지 못했다. 따라서 표의 합계를 이번 작업의 전체 과금량으로
사용하지 않는다. 이후 검증 실패도 `rejected` 상태로 usage를 보존하도록 수정했다.

3편 배치는 두 번째 논문에서 blocked가 됐고, 세 번째 논문은 별도 요청으로
검증했다. **3편 모두 성공하는 종단 간 검증은 아직 통과하지 않았다.** 배치가
막혀도 앞서 완료된 논문의 결과와 호출 이력은 D1에 남는다. 재제출은 duplicate로
반환되며 추가 호출하지 않는다. 운영 단계에서는 논문별 독립 작업과 대체 후보가 필요하다.

발견하여 수정한 구현 문제:

- workerd가 `redirect: error`를 거부해 외부 요청이 실패했다. `manual`과 비정상
  HTTP 상태 차단으로 수정하고, 모킹 테스트에서도 실제 Request를 생성하도록 보완했다.
- 생성된 인용의 길이 초과: 구조화 출력에 길이 제한을 추가했다.
- 검증 실패 시 사용량 유실: 응답을 받았으나 인용이 부정확하면 usage와 오류를 저장한다.
- 로컬 D1 지속성 설정: Miniflare 5 설정을 수정하고 재시작 테스트를 통과했다.
- 배포 직후 이전 리비전이 응답하는 구간을 관찰했다. 활성 버전 API와 새 리비전의
  작업 ID를 모두 확인한 뒤 실행했다. 배포 성공 메시지만으로 반영 완료를 판단하지 않는다.

타입 검사, Workers/D1 통합 테스트 **10개**, D1 재시작 보존 검사, 배포 빌드가 통과했다.
개발 의존성을 포함한 `npm audit` 결과는 취약점 0개였다.

CPU는 별도 보류 항목이다. `node cloudflare/scripts/metrics.mjs`로 HTTP와 Workflow
집계 원자료를 `artifacts/cloudflare/metrics.json`에 기록한다. 초기 관측에서 v2 배치의
`WORKFLOW_RUNNING` cpuTime 합계는 94, 별도 단일 논문 작업은 56이었다. 이는 여러
이벤트의 합계이며 단위와 단계별 분포를 확정하지 않았으므로 무료 한도 통과로 해석하지
않는다. 조회 API는 공식 문서의 `stepName` 필드를 거부했고, 현재 지표만으로 각 단계의
CPU 여유를 입증할 수 없다. HTTP 지표에서 exceededResources는 관찰하지 못했지만
clientDisconnected가 있었으며, 이것 역시 무료 운영 안정성을 증명하지 않는다.

## 완료 기준과 미포함 항목

- [x] 로컬 타입 검사·통합 테스트 통과
- [x] 실제 소스와 API 연결 확인
- [ ] 원격 무료 플랜에서 3편 모두 동일 코드 완료
- [ ] CPU 사용량 및 한도 오류 확인
- [x] 동일 요청에 추가 API 호출 없음
- [x] 일시 소스 장애 재시도·유료 호출 불명확 상태 차단 (통합 테스트)

다음 검증의 우선순위는 요금제/CPU 확인 → 본문 처리 비용 측정과 절별 발췌 개선 →
짧은 근거 문장을 코드에서 후보로 구성하여 모델의 임의 인용을 줄이는 방식 →
논문별 실패 격리와 대체 후보 처리다. 제한을 완화하거나 실패 결과를 자동 발행하지 않는다.

다음 단계: 학기 커리큘럼·주간 후보 수집/순위·Discord 메시지 ID 저장·발행 모호성 복구·
예약 누락 점검·월간 달러 예산·원격 이력 백업. 본 POC를 운영 서비스로 간주하지 않는다.

## 확인한 공식 자료

- [Cloudflare Workflows 제한](https://developers.cloudflare.com/workflows/reference/limits/)
- [D1 제한](https://developers.cloudflare.com/d1/platform/limits/)
- [Workers 통합 테스트](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Hugging Face 공식 클라이언트](https://github.com/huggingface/huggingface_hub/blob/main/src/huggingface_hub/hf_api.py)
- [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
