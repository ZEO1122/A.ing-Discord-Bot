> 개념 알림은 `0005_concepts.sql`을 사용합니다. `concept_semesters`는 release_hash·curriculum_version·schedule_json·상태, `concept_slots`는 학기/회차 PK와 lesson_id·version·hash·scheduled_at·payload_json, `concept_deliveries`는 delivery_key PK와 내용 식별·발송 payload·상태·Discord message/channel ID를 저장합니다. 테스트 키와 학기 키는 별개이며 in_flight/unknown을 자동 재발송하지 않습니다. [상세](CONCEPT_NOTIFICATIONS.md)

> 최신 형식은 v3 설명형 임베드입니다. 세 줄 요약·배경·방법·결과·개념·연구 한계·출처를 사용하며 자료 범위 표시를 제거했습니다. 결과/연구 한계는 근거가 있는 경우만 표시합니다. JSON schema_version=3, background/results 추가, 테이블 변경 없음. [상세](CLOUDFLARE_WEEKLY_PIPELINE.md#설명형-임베드-v3)

> 2026-09-13 임베드 개편: 순위를 유지한 월·주차 제목과 세로형 6개 필드를 사용합니다. 신규 요약 JSON은 `schema_version: 2` 및 `differences`, `prerequisites`를 포함합니다. 기존 JSON과 발송 이력은 보존하며 테이블 변경은 없습니다. 상세는 [주간 파이프라인](CLOUDFLARE_WEEKLY_PIPELINE.md#임베드-개편-v2)을 참고합니다.

> 현재 주간 HF 상위 3편 파이프라인과 구현 상태: [Cloudflare 주간 알림](CLOUDFLARE_WEEKLY_PIPELINE.md). 아래 이전 운영 설명보다 이 문서를 우선합니다.

> **2026-09-13 현재:** 이전 GAS 운영은 종료되었으며, Cloudflare 기술 검증을 진행 중입니다. 신규 검증 경로와 실행 명령은 [Cloudflare 기술 검증 계획](CLOUDFLARE_TECH_PROBE.md)을 기준으로 합니다. 아래 GAS/Python 운영 설명은 이전 구현의 기록이며 새 운영이 배포 완료되었다는 뜻이 아닙니다.

# Database Schema — MVP 기준 데이터 모델

## 1. 문서 목적

이 문서는 `docs/ARCHITECTURE.md`와 `docs/ROADMAP.md`의 용어 체계에 맞춰,
초기 MVP에 필요한 DB 구조를 정리한다.

이 문서에서 사용하는 기준 용어:

- User -> `User Store`
- Briefing -> `Content Store` + `Publish Log Store`
- Quiz -> `Quiz Store`
- Attempt -> `Attempt Store`
- User Stats -> `Stats Query Service`가 계산하거나 선택적으로 캐시
- Admin Report -> `Stats Query Service` 결과를 `Admin Stats View`가 표시

초기 MVP는 아래 흐름을 지원하면 된다.

1. Week 1: 브리핑 발행
2. Week 2: 퀴즈 제출 및 채점
3. Week 3: 사용자 기록 및 관리자 통계

## 2. 설계 원칙

- MVP 기준 필수 테이블과 필수 컬럼만 먼저 둔다.
- `discussion_prompt`와 graded quiz 데이터는 분리한다.
- 브리핑과 출처는 분리 저장한다.
- 퀴즈와 제출 이력은 분리 저장한다.
- `content_id`, `quiz_id`, `discord_message_id`, `user_id` 매핑을 유지한다.
- 통계는 원본 Attempt 데이터에서 계산 가능하게 설계한다.
- 공개 메시지에 노출되면 안 되는 정답 데이터는 DB 내부 필드로만 보관한다.

## 3. MVP 엔터티 기준 정리

### 3.1 User

의미:
- Discord 사용자와 내부 식별자 매핑
- `User Store`가 관리하는 최소 사용자 정보

### 3.2 Briefing

의미:
- 오늘의 브리핑 본문과 출처
- `Content Store`와 `Publish Log Store`가 관리하는 데이터

### 3.3 Quiz

의미:
- 브리핑에 연결된 채점형 퀴즈
- `Quiz Store`가 관리하는 데이터

### 3.4 Attempt

의미:
- 사용자의 퀴즈 제출 이력
- `Attempt Store`가 관리하는 데이터

### 3.5 User Stats

의미:
- 사용자별 응답 수, 정답 수 등 집계 결과
- 초기 MVP에서는 테이블 없이 `Stats Query Service`가 계산해도 충분하다

### 3.6 Admin Report

의미:
- 관리자 통계 조회용 결과 집합
- 초기 MVP에서는 별도 테이블 없이 `Stats Query Service`가 조회하고 `Admin Stats View`가 렌더링한다

## 4. MVP 필수 테이블

초기 MVP에서 먼저 제안하는 필수 테이블:

1. `users`
2. `briefings`
3. `briefing_sources`
4. `publish_logs`
5. `quizzes`
6. `quiz_choices`
7. `attempts`

초기 MVP에서는 `user_stats`와 `admin_reports`를 필수 테이블로 두지 않는다.
둘 다 `Stats Query Service`의 조회 결과로 먼저 해결한다.

## 5. 테이블 정의

### 5.1 users

User 기준 최소 테이블이다.

```sql
CREATE TABLE users (
    id                BIGSERIAL PRIMARY KEY,
    discord_user_id   TEXT NOT NULL UNIQUE,
    display_name      TEXT,
    username          TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

필수 컬럼 설명:
- `id`: 내부 User ID
- `discord_user_id`: Discord 고유 사용자 ID
- `display_name`: 표시 이름
- `username`: 계정명

### 5.2 briefings

Briefing 본문을 저장하는 `Content Store` 기준 테이블이다.

```sql
CREATE TABLE briefings (
    id                 BIGSERIAL PRIMARY KEY,
    briefing_key       TEXT NOT NULL UNIQUE,
    track              TEXT NOT NULL,
    title              TEXT NOT NULL,
    one_line           TEXT NOT NULL,
    what_happened      TEXT NOT NULL,
    why_it_matters     TEXT NOT NULL,
    easy_terms_json    JSONB NOT NULL,
    discussion_prompt  TEXT,
    status             TEXT NOT NULL DEFAULT 'draft',
    published_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

필수 컬럼 설명:
- `briefing_key`: 외부 참조용 브리핑 키
- `track`: 초기 MVP에서는 주로 `dl-basics`
- `discussion_prompt`: 브리핑용 질문, graded quiz와 분리
- `easy_terms_json`: 쉬운 용어 목록
- `status`: `draft`, `published` 정도로 시작 가능

### 5.3 briefing_sources

Briefing 출처를 저장하는 테이블이다.

```sql
CREATE TABLE briefing_sources (
    id                BIGSERIAL PRIMARY KEY,
    briefing_id       BIGINT NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    url               TEXT NOT NULL,
    normalized_url    TEXT,
    source_type       TEXT,
    published_at      DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

필수 컬럼 설명:
- `briefing_id`: 어떤 Briefing의 출처인지 연결
- `normalized_url`: 중복 검사와 정규화용
- `source_type`: `paper`, `blog`, `docs` 등

### 5.4 publish_logs

`Publish Log Store` 기준 게시 이력 테이블이다.

```sql
CREATE TABLE publish_logs (
    id                   BIGSERIAL PRIMARY KEY,
    briefing_id          BIGINT NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    quiz_id              BIGINT REFERENCES quizzes(id) ON DELETE SET NULL,
    discord_guild_id     TEXT,
    discord_channel_id   TEXT NOT NULL,
    discord_message_id   TEXT,
    publish_status       TEXT NOT NULL,
    error_message        TEXT,
    published_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

필수 컬럼 설명:
- `briefing_id`: 어떤 Briefing을 게시했는지
- `quiz_id`: 게시 시 연결된 Quiz가 있으면 참조
- `discord_message_id`: Discord 메시지 매핑용 핵심 필드
- `publish_status`: `success`, `failed` 등

### 5.5 quizzes

`Quiz Store` 기준 퀴즈 메타데이터 테이블이다.

```sql
CREATE TABLE quizzes (
    id                 BIGSERIAL PRIMARY KEY,
    briefing_id        BIGINT NOT NULL REFERENCES briefings(id) ON DELETE CASCADE,
    quiz_type          TEXT NOT NULL,
    question           TEXT NOT NULL,
    answer_key_json    JSONB NOT NULL,
    hint               TEXT,
    explanation        TEXT,
    status             TEXT NOT NULL DEFAULT 'draft',
    opens_at           TIMESTAMPTZ,
    closes_at          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

필수 컬럼 설명:
- `briefing_id`: 어떤 Briefing에 연결된 Quiz인지
- `quiz_type`: 초기 MVP는 `mcq`
- `answer_key_json`: 실제 판정 기준
- `hint`, `explanation`: 개인 피드백용
- `status`: `draft`, `open`, `closed`

### 5.6 quiz_choices

객관식 보기 테이블이다.

```sql
CREATE TABLE quiz_choices (
    id                BIGSERIAL PRIMARY KEY,
    quiz_id           BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    choice_order      INTEGER NOT NULL,
    choice_text       TEXT NOT NULL,
    UNIQUE (quiz_id, choice_order)
);
```

MVP에서는 `is_correct`를 choice 테이블에 두지 않는다.
정답 기준은 `quizzes.answer_key_json` 하나로 맞춘다.

### 5.7 attempts

`Attempt Store` 기준 사용자 제출 이력 테이블이다.

```sql
CREATE TABLE attempts (
    id                 BIGSERIAL PRIMARY KEY,
    quiz_id            BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_no         INTEGER NOT NULL,
    raw_answer         TEXT,
    normalized_answer  TEXT,
    is_correct         BOOLEAN,
    score              INTEGER NOT NULL DEFAULT 0,
    submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (quiz_id, user_id, attempt_no)
);
```

필수 컬럼 설명:
- `quiz_id`: 어떤 Quiz에 대한 Attempt인지
- `user_id`: 어떤 User의 Attempt인지
- `attempt_no`: 몇 번째 제출인지
- `raw_answer`: 원본 입력값
- `normalized_answer`: 채점용 정규화 값
- `is_correct`: 채점 결과
- `score`: 점수 정책 반영 결과

## 6. User Stats 와 Admin Report 처리 방식

### 6.1 User Stats

초기 MVP에서는 별도 `user_stats` 테이블 없이 시작한다.

이유:
- `Attempt Store` 원본 데이터가 아직 크지 않다.
- `Stats Query Service`가 아래 값을 계산하면 충분하다.
  - 총 응답 수
  - 정답 수
  - 첫 시도 정답 수
  - 최근 응답 시각

필요해지면 이후 아래 캐시 테이블을 추가할 수 있다.

```sql
CREATE TABLE user_stats (
    user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_attempts      INTEGER NOT NULL DEFAULT 0,
    correct_attempts    INTEGER NOT NULL DEFAULT 0,
    first_try_corrects  INTEGER NOT NULL DEFAULT 0,
    last_answered_at    TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.2 Admin Report

초기 MVP에서는 별도 `admin_reports` 테이블을 두지 않는다.

`Admin Stats View`가 `Stats Query Service` 결과를 바로 보여주면 된다.
즉, Admin Report는 저장 테이블이 아니라 조회 결과 집합으로 취급한다.

예시 출력 항목:
- 총 응답자 수
- 총 제출 수
- 정답률
- 사용자별 응답 횟수
- 사용자별 정답 수

## 7. 관계 요약

### 7.1 엔터티 관계

```text
User 1 ──< Attempt >── 1 Quiz >── 1 Briefing
Briefing 1 ──< BriefingSource
Briefing 1 ──< PublishLog
Quiz 1 ──< QuizChoice
PublishLog >── 0..1 Quiz
```

### 7.2 컴포넌트 기준 관계

```text
Content Store
  ├─ briefings
  └─ briefing_sources

Publish Log Store
  └─ publish_logs

Quiz Store
  ├─ quizzes
  └─ quiz_choices

User Store
  └─ users

Attempt Store
  └─ attempts
```

### 7.3 흐름 기준 관계 설명

- Week 1: `Publish Service`는 `briefings`와 `briefing_sources`를 읽고, 결과를 `publish_logs`에 남긴다.
- Week 2: `Quiz Entry UI`와 `Submission Handler`는 `quizzes`, `quiz_choices`를 사용하고 `Grading Service`는 `answer_key_json`으로 판정한다.
- Week 3: `Attempt Recording Service`는 `users`, `attempts`를 갱신하고 `Stats Query Service`는 `attempts` 기반으로 Admin Report를 계산한다.

## 8. MVP 권장 인덱스

```sql
CREATE INDEX idx_briefings_track_status ON briefings(track, status);
CREATE INDEX idx_briefing_sources_normalized_url ON briefing_sources(normalized_url);
CREATE INDEX idx_publish_logs_briefing_id ON publish_logs(briefing_id);
CREATE INDEX idx_quizzes_briefing_id ON quizzes(briefing_id);
CREATE INDEX idx_quizzes_status_opens_at ON quizzes(status, opens_at);
CREATE INDEX idx_attempts_quiz_id ON attempts(quiz_id);
CREATE INDEX idx_attempts_user_id_submitted_at ON attempts(user_id, submitted_at DESC);
```

## 9. Stats Query Service 예시 조회

### 9.1 사용자별 총 응답 수

```sql
SELECT u.discord_user_id, COUNT(*) AS total_attempts
FROM attempts a
JOIN users u ON u.id = a.user_id
GROUP BY u.discord_user_id
ORDER BY total_attempts DESC;
```

### 9.2 사용자별 정답 수

```sql
SELECT u.discord_user_id, COUNT(*) AS correct_attempts
FROM attempts a
JOIN users u ON u.id = a.user_id
WHERE a.is_correct = TRUE
GROUP BY u.discord_user_id
ORDER BY correct_attempts DESC;
```

### 9.3 퀴즈별 응답자 수와 정답률

```sql
SELECT
    a.quiz_id,
    COUNT(DISTINCT a.user_id) AS participants,
    COUNT(*) FILTER (WHERE a.is_correct) * 100.0 / NULLIF(COUNT(*), 0) AS accuracy
FROM attempts a
GROUP BY a.quiz_id;
```

## 10. 운영 시 유의점

- `discord_message_id`는 반드시 저장한다.
- 삭제/재게시 추적은 `publish_logs` 기준으로 한다.
- `attempt_no`는 서버가 계산한다.
- User Stats는 원본 `attempts`에서 다시 계산 가능해야 한다.
- `answer_key_json`은 외부 API 응답, 공개 메시지, 로그에 실수로 노출되지 않게 주의한다.
