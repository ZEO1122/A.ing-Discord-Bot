> 개념 알림 신규 구현: [Markdown 기반 36회 과정](CONCEPT_NOTIFICATIONS.md). 대표 3편·검증/미리보기·학기 일정 고정 구현, 월·수·금 09:00 KST. 전체 집필과 승인 전이며 자동 운영은 비활성입니다.

> 현재 주간 HF 상위 3편 파이프라인과 구현 상태: [Cloudflare 주간 알림](CLOUDFLARE_WEEKLY_PIPELINE.md). 아래 이전 운영 설명보다 이 문서를 우선합니다.

> **2026-09-13 현재:** 이전 GAS 운영은 종료되었으며, Cloudflare 기술 검증을 진행 중입니다. 신규 검증 경로와 실행 명령은 [Cloudflare 기술 검증 계획](CLOUDFLARE_TECH_PROBE.md)을 기준으로 합니다. 아래 GAS/Python 운영 설명은 이전 구현의 기록이며 새 운영이 배포 완료되었다는 뜻이 아닙니다.

# Architecture — GAS 중심 발행 구조

## 1. 문서 목적

이 문서는 AI 학술동아리 Discord 브리핑 시스템의 현재 아키텍처를 설명한다.

현재 기본 운영 경로는 아래와 같다.

1. concept 브리핑은 GitHub public repo의 markdown을 읽는다.
2. trend 브리핑은 Apps Script가 최신 source를 수집하고 GPT API로 생성한다.
3. 예약 실행은 Google Apps Script time trigger가 담당한다.
4. Discord 전송은 webhook으로 처리한다.

## 2. 핵심 설계 원칙

- 상시 서버를 기본 전제로 두지 않는다.
- 자동화의 중심은 `Google Apps Script + Discord Webhook`이다.
- GitHub는 concept 원본과 설정의 source of truth로 유지한다.
- trend 브리핑은 source 없이 자동 게시하지 않는다.
- concept 브리핑은 저장소의 markdown 파일을 진실 소스로 본다.
- 게시 실패는 Apps Script 실행 로그와 Discord 게시 결과로 추적 가능해야 한다.

## 3. 현재 기본 구조

```text
[GitHub Public Repo]
   ├─ concept markdown
   ├─ concept manifest
   └─ channel interest config
              ↓
       [Google Apps Script]
   ├─ ConceptService
   ├─ TrendService
   ├─ GitHub raw fetch
   ├─ OpenAI generate
   ├─ Discord webhook send
   ├─ Script Properties
   └─ Google Sheets history
```

## 4. Concept 브리핑 자동 게시

### 목표
- 미리 작성한 딥러닝 개념 markdown을 평일 오전 9시에 Discord에 안정적으로 게시한다.

### 핵심 컴포넌트

#### GitHub Concept Source
- `content/concepts/**/*.md`
- `content/concepts/manifest.json`

#### Concept Queue
- Script Properties에 저장된 progress를 읽어 다음 concept를 선택한다.

#### Concept Renderer
- markdown frontmatter와 본문 섹션을 파싱한다.
- Discord full embed payload를 만든다.

#### Concept Delivery
- concept 채널 webhook으로 게시한다.

### 데이터 흐름

```text
1. manifest 읽기
2. Script Properties에서 last index 읽기
3. 다음 concept 선택
4. markdown 파싱
5. embed 생성
6. Discord webhook 게시
7. Script Properties progress 갱신
```

## 5. Trend 브리핑 자동 게시

### 목표
- 채널별 관심분야를 읽고, 월요일 오전 9시에 최신 source를 바탕으로 trend 브리핑을 게시한다.

### 핵심 컴포넌트

#### Channel Interest Map
- `config/channel_interest_map.json`
- 채널별 관심분야와 webhook key를 정의한다.

#### Live Trend Source Fetch
- Apps Script가 arXiv API를 먼저 시도한다.
- 필요 시 RSS fallback을 사용한다.
- taxonomy:
  - `llm`
  - `detection-segmentation`
  - `vision-language`

#### GPT Generation
- source 목록만 근거로 GPT API 브리핑을 생성한다.
- 출력 구조:
  - `title`
  - `core_explanation`
  - `why_it_matters`
  - `quick_terms`
  - `discussion_prompt`

#### Trend History Store
- Google Sheets `trend_history`
- `channel_id + interest + normalized_url` 기준 중복 방지

#### Trend Delivery
- `DISCORD_WEBHOOK_MAP_JSON`에서 채널별 webhook을 찾아 전송한다.

### 데이터 흐름

```text
1. channel_interest_map 로드
2. 채널별 관심분야 선택
3. 관심분야별 최신 source 수집
4. Google Sheets history 기준 중복 제거
5. GPT API 호출
6. 출력 정규화 및 검증
7. Discord embed 생성
8. webhook 게시
9. Google Sheets history 기록
```

## 6. 상태 저장 전략

### Concept progress
- 저장 위치: Script Properties
- 예:
  - `CONCEPT_LAST_INDEX`
  - `CONCEPT_LAST_PATH`
  - `CONCEPT_LAST_BRIEFING_KEY`
  - `CONCEPT_LAST_POSTED_AT`

### Trend history
- 저장 위치: Google Sheets
- 시트 이름: `trend_history`
- 컬럼:
  - `channel_key`
  - `channel_id`
  - `interest`
  - `source_url`
  - `source_title`
  - `published_at`
  - `posted_at`
  - `brief_title`

## 7. 개발/보조 구조

현재 저장소에는 `src/bot/*` 기반 Gateway bot 코드와 Python 스크립트도 있다.

이 코드는 아래 용도로 유지한다.
- 로컬 실험
- 과거 구현 참고
- 필요 시 수동 디버깅

하지만 현재 운영 기본 구조는 아니다.

## 8. 운영 기본값

### 기본 운영
- GAS time trigger
- Discord webhook 게시
- Apps Script 실행 로그 기반 추적

### 보조 운영
- GitHub public repo에서 source 읽기
- 로컬 Python 수동 실험

## 9. 장애 포인트와 대응

### 9.1 concept 게시 실패
- manifest 경로 확인
- markdown 포맷 확인
- Script Properties progress 확인
- embed 제한 초과 여부 확인

### 9.2 trend 게시 실패
- source fetch 성공 여부 확인
- OpenAI 응답 구조 확인
- webhook map key 일치 여부 확인
- Google Sheets history 접근 가능 여부 확인

### 9.3 Discord 게시 성공 여부 불명확
- Apps Script 실행 로그 확인
- webhook 응답 본문 확인
- Google Sheets history 또는 Script Properties 갱신 여부 확인

## 10. 설계 결론

현재 이 프로젝트의 핵심은 **GitHub가 콘텐츠 저장소 역할을 하고, Google Apps Script가 예약 실행기 역할을 맡아 Discord webhook으로 자동 발행하는 구조**다.

즉, 이 프로젝트는 **GAS 중심 브리핑 자동화 시스템**으로 이해하는 것이 맞다.
