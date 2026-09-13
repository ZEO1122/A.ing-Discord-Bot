> 개념 알림 신규 구현: [Markdown 기반 36회 과정](CONCEPT_NOTIFICATIONS.md). 36편 초안·검증/미리보기·학기 일정 고정 구현, 월·수·금 09:00 KST. 콘텐츠 최종 승인 전이며 자동 운영은 비활성입니다.

> 현재 주간 HF 상위 3편 파이프라인과 구현 상태: [Cloudflare 주간 알림](CLOUDFLARE_WEEKLY_PIPELINE.md). 아래 이전 운영 설명보다 이 문서를 우선합니다.

> **2026-09-13 현재:** 이전 GAS 운영은 종료되었으며, Cloudflare 기술 검증을 진행 중입니다. 신규 검증 경로와 실행 명령은 [Cloudflare 기술 검증 계획](CLOUDFLARE_TECH_PROBE.md)을 기준으로 합니다. 아래 GAS/Python 운영 설명은 이전 구현의 기록이며 새 운영이 배포 완료되었다는 뜻이 아닙니다.

# Roadmap — GAS 중심 MVP

## MVP 범위

현재 서버 없는 운영 제약에서 초기 MVP는 아래 순서를 따른다.

1. concept 브리핑 자동 게시
2. trend 브리핑 자동 게시
3. 게시 로그와 검증 규칙 정리
4. 퀴즈 포함 게시 포맷 정리
5. 제출/통계 기능은 후순위

핵심 원칙:
- concept 브리핑은 저장소의 `.md` 파일을 진실 소스로 본다.
- trend 브리핑은 source 없이 자동 게시하지 않는다.
- 자동 발행은 `Google Apps Script + Discord Webhook`으로 처리한다.
- 상시 `discord.py` Gateway bot은 개발/실험용 보조 경로로 둔다.

## Week 1 — concept 브리핑 자동 게시

### 목표
- `content/concepts/**/*.md` 브리핑을 Discord에 자동 게시한다.
- concept 브리핑 포맷과 검증 규칙을 고정한다.
- manifest/progress 기반 순차 게시를 확정한다.

### 체크리스트
- [ ] concept markdown 디렉터리 구조 정의
- [ ] markdown frontmatter 규격 확정
- [ ] 본문 섹션 규격 확정
- [ ] concept parser 구현
- [ ] `content/concepts/manifest.json` 추가
- [ ] Script Properties 기반 progress 저장 구현
- [ ] GAS `runConceptDaily()` 구현
- [ ] 수동 실행 검증
- [ ] 평일 9시 KST trigger 설정

### 완료 조건
- [ ] concept markdown 1건을 GAS에서 Discord로 게시할 수 있다
- [ ] 게시 후 progress가 Script Properties에 저장된다

## Week 2 — trend 브리핑 생성/게시

### 목표
- 채널별 관심분야 설정을 읽고 최신 source를 수집해 GPT로 trend 브리핑을 생성하고 Discord에 게시한다.

### 체크리스트
- [ ] trend source 수집 전략 정의
- [ ] track별 source fetch 규칙 정의
- [ ] `llm`, `detection-segmentation`, `vision-language` query 정교화
- [ ] `config/channel_interest_map.json` 추가
- [ ] Script Properties webhook map 구조 확정
- [ ] GPT prompt 템플릿 확정
- [ ] GAS `runTrendWeekly()` 구현
- [ ] Google Sheets history 구조 확정
- [ ] source 수집 실패 처리 규칙 추가
- [ ] source 필수 검증 규칙 추가
- [ ] 최근 게시 source 중복 방지 규칙 추가

### 완료 조건
- [ ] 채널별 관심분야를 읽어 weekly trend 브리핑을 채널별로 자동 게시할 수 있다
- [ ] source 없는 trend 생성은 차단된다
- [ ] Google Sheets history가 기록된다

## Week 3 — 퀴즈/기록 방식 재설계

### 목표
- 서버 없는 운영 제약 안에서 퀴즈를 어떤 방식으로 게시/수집할지 결정한다.

### 체크리스트
- [ ] 브리핑 게시물에 포함할 퀴즈 포맷 확정
- [ ] 공개 메시지에 노출 가능한 퀴즈 정보 범위 확정
- [ ] 답변 수집 방식 옵션 비교
- [ ] 서버 없는 운영에 맞는 기록 전략 문서화

### 완료 조건
- [ ] 현재 운영 제약 안에서 가능한 퀴즈 UX가 정의된다

## MVP 최종 완료 조건

- [ ] concept markdown을 GAS로 자동 게시할 수 있다
- [ ] 채널별 trend 브리핑을 GAS로 자동 게시할 수 있다
- [ ] concept progress가 Script Properties에 저장된다
- [ ] trend history가 Google Sheets에 저장된다
- [ ] 게시 실패 원인을 GAS 실행 로그로 추적할 수 있다

## 후순위 확장 항목

- [ ] `discord.py` Gateway bot 상시 운영
- [ ] `/quiz_solve`
- [ ] `/stats me`
- [ ] `/admin stats`
- [ ] 외부 DB 기반 사용자 통계
