# Markdown 기반 딥러닝 개념 알림

## 현재 구현 범위

12주 × 주 3회, 총 36회 목차와 선수 개념 그래프를 만들었다. 첫 단계의 대표 콘텐츠
01(Tensor), 12(Backpropagation), 27(학습 디버깅)을 작성했다. 33편은 아직 집필 전이며
대표 콘텐츠도 사용자 형식 검토 전인 draft 상태다. 전체 과정이 운영 준비 완료라는 뜻은 아니다.

사용자가 확정한 시각은 월·수·금 09:00 Asia/Seoul이다. 학기 시작일과 시험 기간은
미정이다. config/semesters/example.yaml의 시작일은 테스트 예시일 뿐이며 자동 예약은
등록하지 않았다. 테스트 채널은 기존 Discord Webhook을 사용하도록 확인받았다.

## 구조

- `content/dl-foundations/curriculum.yaml`: 36개 ID, 순서, 제목, 파일, 선수 개념.
- `content/dl-foundations/lessons/*.md`: 공개 가능한 개념 원본. 파일 하나가 메시지 하나다.
- `content/dl-foundations/reviews.yaml`: 승인 콘텐츠의 SHA-256, 검토자, 검토일.
- `scripts/content/compiler.mjs`: YAML/Markdown 검증, 임베드 생성, 내용 해시 계산.
- `scripts/content/schedule.mjs`: 한국시간 요일·시각과 휴강 기간을 UTC 일정으로 변환.
- `cloudflare/src/generated/concepts.json`: 빌드된 정적 payload. 파서는 Worker에 포함하지 않는다.
- `cloudflare/src/concepts.ts`: 인증된 미리보기, 테스트 발송, 학기 일정 고정, 발송 기록.

발송 때 GitHub나 OpenAI를 호출하지 않는다. Git push와 Cloudflare 배포는 별도 작업이다.
GitHub Actions와 GAS는 사용하지 않는다. 과거 `content/concepts/`와 Python/GAS 코드는
이전 구현의 참고 자료로 보존하며 새 학기 과정에 자동 포함하지 않는다.

## 작성 규칙

Frontmatter는 id, title, order, version, status, objective, prerequisites, sources를 가진다.
본문은 다음 여섯 섹션을 정확히 한 번, 순서대로 작성한다.

1. 오늘의 핵심
2. 왜 필요한가?
3. 작동 원리
4. 작은 예제로 확인하기
5. 자주 하는 오해
6. 복습 질문

본문 설명은 한국어, AI 전문 용어는 영어를 유지한다. 이모지는 넣지 않는다.
각 섹션은 글머리 기호로 나누고 항목마다 원리·이유·해석을 완결된 문장으로 설명한다.
코드 실행보다 개념 설명에 비중을 둔다. 작은 예제는 수치 계산이나 상황별 판단 사례로
작성하고, 공개 알림의 코드 블록은 기본적으로 생략한다. 짧은 수식과 Shape 표기는 허용한다.
HTML·이미지·LaTeX 전용 블록은 지원하지 않는다. 코드 블록은 python/text를 사용한다.
학습 목표와 참고 자료는 메타데이터에서 별도 필드로 만들어 총 8개 필드가 된다.
Discord의 필드별 1,024자·전체 6,000자 제한을 넘으면 잘라서 보내지 않고 빌드를 실패시킨다.

sources는 실제 참고한 book/ chapter/ url을 구조적으로 저장한다. 허용 서적은 d2l,
deep-learning, deep-learning-from-scratch다. 링크를 구조적으로 검사하며 자동 검증이
출처의 내용을 읽거나 교육적 정확성을 보증하는 것은 아니다. 책 문장과 코드를 길게
복제하지 않고 설명과 작은 예제를 직접 작성한다.

복습 질문은 채점하지 않는 학습 질문이다. answer_key, accepted_keywords 등 채점 정보는
공개 콘텐츠에 넣지 않는다. 정답 공개나 개인 점수 수집은 이번 범위가 아니다.

## 로컬 실행

Node 24 및 `npm ci`를 사용한다. 예제 검증에는 Python 3와 NumPy가 필요하다.

```bash
npm run content:validate
npm run content:test
npm run content:examples
npm run content:preview
npm run content:build
npm run cf:typecheck
npm run cf:test
npm run content:schedule -- config/semesters/example.yaml
```

preview는 `artifacts/concepts/preview.html` 및 메시지별 JSON을 만든다. HTML은 텍스트와
줄바꿈 확인용이며 최종 Discord 화면은 테스트 채널에서 확인한다. 예제 실행 명령은
내부 검산용 Python 예제를 실행하고 결과를 검사한다. 이 코드는 공개 알림에 포함하지 않으며
현재 Markdown의 문장과 자동으로 동기화되지는 않으므로 콘텐츠 수정 시 수동 대조한다.
Worker는 Python을 실행하지 않는다.

## 검토와 배포

초안은 status=draft로 저장한다. 내용·예제·출처를 검토한 후 status=approved로 바꾸고,
최종 파일 전체의 SHA-256을 reviews.yaml에 아래처럼 등록한다. 검토자 이름을 임의로
다른 사람으로 쓰지 않는다. 수정 시 version을 올리고 다시 검토한다.

```yaml
dl-foundations-01:
  sha256: '<최종 Markdown 파일의 SHA-256>'
  reviewer: '<실제 검토자>'
  date: '2026-09-13'
```

approved 파일의 내용이나 공백이 바뀌어도 해시가 달라져 승인 상태를 재확인해야 한다.
실제 학기 운영용 빌드는 아래 명령이 통과해야 한다.

```bash
npm run content:build -- --production
```

지금은 33편 미작성으로 이 명령이 실패하는 것이 정상이다. 개발 빌드에는 draft를 담을 수
있지만 production_ready=false이고 학기 등록 API가 거부한다. 원격 테스트는 별도 명시적
CONCEPT_TEST_ENABLED 게이트로만 보낼 수 있다.

배포 전에 content:build를 다시 실행한다. Git 저장소의 Markdown 수정만으로 운영
Worker가 바뀌지는 않는다. `npm run cf:deploy`는 빌드 후 현재 검증 Worker를 배포한다.
본 서비스 활성화 전에는 production 빌드·원격 CPU 검증·실제 채널 설정을 완료해야 한다.

## 학기 일정과 복구

- 학기마다 ID와 curriculum_version을 지정하고 36개 회차를 순서대로 배치한다.
- 휴강 날짜는 시작·끝 날짜를 포함한다. 겹치는 휴강도 한 번만 적용한다.
- 해당 날짜에는 발송하지 않고 다음 월·수·금 슬롯으로 콘텐츠를 밀어낸다.
- 등록 시 release_hash와 각 회차의 payload/version/hash를 D1에 고정한다.
- 새 콘텐츠 배포가 이미 등록된 학기의 payload를 조용히 바꾸지 않는다.
- 같은 학기·회차는 중복 발송하지 않으며 새 학기 ID는 같은 내용을 다시 발송할 수 있다.
- 가장 이른 미발송 회차 하나만 처리한다. 6시간 이상 늦었거나 결과가 unknown이면
  건너뛰거나 여러 회차를 몰아서 보내지 않고 운영 확인 대상으로 남긴다.
- 자동 재발송은 없다. 수동 재예약·활성화 도구와 운영 화면은 후속 단계다.

예시 일정은 별도 계획 파일을 만들 뿐 활성화하지 않는다. 실제 학기 시작일 확정 전까지
CONCEPT_SCHEDULE_ENABLED=false를 유지한다.

## 인증된 관리 경로

모든 경로는 기존 ADMIN_TOKEN 인증이 필요하다.

- GET /concepts: 빌드 버전과 콘텐츠 목록.
- GET /concepts/preview/{lesson_id}: 메시지 payload.
- POST /concepts/test/{lesson_id}: 확인된 테스트 채널로 발송. 테스트 게이트 필요.
- POST /concepts/semesters: 전체 승인 빌드로 36회 일정 등록. paused 상태로 생성.
- GET /concepts/semesters/{semester_id}: 고정 일정과 발송 상태 조회.

학기 등록 본문은 id, release_hash, slots(sequence, lesson_id, scheduled_at)를 포함한다.
시험 일정 등 원본 설정은 Git에서 관리하고 확정 UTC 슬롯을 D1에 등록한다.

CONCEPT_WEBHOOK_URL은 개념 채널 전용 Secret이다. 테스트와 자동 발송 모두 이 값이
필수이며 DISCORD_WEBHOOK_URL(뉴스 채널)로 대체하지 않는다. 실제 URL과 토큰을 YAML/Markdown/빌드 데이터에 넣지 않는다.

## 다음 단계

대표 3편의 분량·구성을 확인한 뒤 나머지 33편을 같은 규격으로 작성한다. 전체 승인,
학기 시작일·시험 기간 확정, 운영 채널 지정, 스케줄 활성화·복구 도구 보완 및 실제 Cron
검증 후 학기 운영을 시작한다. 현재 테스트 발송 성공을 자동 학기 운영 완료로 보지 않는다.

## 이번 단계의 사용자 설정

학기 시작일은 사용자가 '추후 결정'으로 지정했다. 월·수·금 09:00은 확정했지만
실제 학기는 아직 생성하거나 활성화하지 않는다. 공개 GitHub 대상은
https://github.com/ZEO1122/A.ing-Discord-Bot 이다.

테스트 조회/발송 도구:

```bash
npm run content:remote -- --lesson dl-foundations-01
npm run content:remote -- --lesson dl-foundations-01 --send
```

send는 테스트 게이트가 활성화되어야 하며 같은 Webhook ID와 내용 해시의 재요청은 기존 Discord ID를
반환한다. 이 단계는 API 없이 정적 Markdown을 발행하는 경로를 검증한다.

## 원격 검증 결과 (2026-09-13)

- 01 Tensor·Shape·Axis, 12 Backpropagation, 27 Training Debugging을 확인된
  Discord 테스트 채널에 각각 한 번 발송했다.
- 01 재요청은 duplicate=true와 기존 메시지 ID를 반환했고 추가 발송하지 않았다.
- 원격 D1에 발송 상태와 Discord 메시지 매핑을 저장했다.
- 관측한 발송 요청의 Worker CPU 시간은 7/4/8ms, 중복 요청은 1ms였다.
  이는 이번 표본의 측정치이며 모든 요청의 실행 시간을 보장하지 않는다.
- 콘텐츠 테스트 12개, Cloudflare 테스트 47개, 대표 콘텐츠 Python 예제 3개가 통과했다.
- 검증 후 테스트·자동 발송 게이트를 모두 false로 복구하여 배포했다.
  배포 버전: d57aaa4a-24cb-4d50-9122-9510ce4aef78.

## 채널 분리 설정

Discord 개념 채널의 채널 편집 → 연동 → Webhook에서 전용 URL을 만들고, 로컬 .env의
CONCEPT_WEBHOOK_URL에 저장한다. 뉴스용 DISCORD_WEBHOOK_URL은 그대로 유지한다.
`npm run cf:secrets -- --concept`으로 개념 Secret만 등록한다. URL은 출력하지 않는다.
기존 채널에 게시한 메시지와 발송 기록은 유지한다. 테스트 중복 키는 Webhook ID와
내용 해시를 사용하므로 새 Webhook에서는 같은 콘텐츠를 검증할 수 있다. 자동 학기 발송의
중복 키는 학기·회차 그대로이며 채널 변경만으로 이미 보낸 회차를 다시 보내지 않는다.
