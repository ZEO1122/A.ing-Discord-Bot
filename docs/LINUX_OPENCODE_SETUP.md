# Linux + OpenCode Setup Guide

## 1. 목표

이 문서는 Linux 환경에서 OpenCode를 사용해 이 프로젝트를 개발하기 위한 최소 설정 가이드다.

## 2. 사전 준비

권장 준비물:
- Linux 터미널 환경
- Git
- curl
- Python 3.11+
- 가상환경 도구(`venv` 또는 `uv`)
- OpenCode
- 사용할 LLM provider 계정/API 키

## 3. OpenCode 설치

### 방법 A — 공식 설치 스크립트
```bash
curl -fsSL https://opencode.ai/install | bash
```

### 방법 B — npm 전역 설치
```bash
npm install -g opencode-ai
```

설치 후 확인:
```bash
opencode --help
```

## 4. 로그인

```bash
opencode auth login
```

OpenCode는 인증 정보를 로컬에 저장한다.  
프로바이더 키는 환경변수나 `.env` 파일에서도 읽을 수 있는 흐름을 염두에 둔다.

## 5. 프로젝트 시작

```bash
git clone <your-repo>
cd <your-repo>
opencode
```

OpenCode를 처음 프로젝트에 붙일 때는 다음을 실행한다.

```text
/init
```

이 명령은 프로젝트를 분석하고 `AGENTS.md` 초안을 만든다.  
이미 `AGENTS.md`가 있으면 내용을 보강하려고 시도한다.

## 6. 중요한 경로

### 글로벌 설정
- `~/.config/opencode/opencode.json`
- `~/.config/opencode/tui.json`
- `~/.config/opencode/AGENTS.md`

### 프로젝트 설정
- `opencode.json`
- `tui.json`
- `AGENTS.md`
- `.opencode/commands/`
- `.opencode/skills/`

### 로그/저장소
- `~/.local/share/opencode/log/`
- `~/.local/share/opencode/`

## 7. 설정 우선순위

프로젝트 개발 시 기억할 점:

- 전역 설정이 기본값이 된다.
- 프로젝트 루트 `opencode.json`이 전역 설정보다 우선한다.
- `.opencode/` 아래의 commands / skills / agents 등도 프로젝트 로컬 맥락으로 로드된다.

즉, 이 저장소 안에 `.opencode/commands/*.md` 와 `.opencode/skills/*/SKILL.md` 를 넣으면 팀 전체가 같은 워크플로우를 공유하기 쉬워진다.

## 8. OpenCode에서 자주 쓸 개념

### Build Agent
- 실제 파일 수정과 명령 실행에 적합
- 구현 작업에 사용

### Plan Agent
- 계획/분석 위주
- 무분별한 수정 전에 사용하기 좋음

권장 습관:
- 새 기능 → 먼저 Plan
- 구현/리팩터링 → Build
- 대규모 구조 변경 → Plan → Build 순서

## 9. 프로젝트 전용 명령 추가하기

이 저장소에는 `.opencode/commands/*.md` 파일이 들어 있다.  
OpenCode는 이 파일들을 프로젝트 로컬 커맨드로 읽는다.

예:
- `/plan-feature 퀴즈 모달`
- `/build-feature 퀴즈 모달`
- `/review-changes`
- `/make-migration attempts schema`

## 10. 프로젝트 전용 스킬 추가하기

이 저장소에는 `.opencode/skills/<name>/SKILL.md` 도 포함되어 있다.

예:
- `discord-bot`
- `content-pipeline`
- `quiz-grading`
- `linux-ops`

이 스킬은 OpenCode가 필요할 때 불러올 수 있는 재사용 규칙 세트다.

## 11. 추천 Linux 개발 루틴

### 11.1 Python 환경 준비
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
```

### 11.2 의존성 설치
프로젝트 시작 후에는 다음 중 하나를 고른다.
- `pip`
- `uv`
- `poetry`

초기에는 복잡도를 줄이기 위해 `pip + requirements.txt` 또는 `uv` 둘 중 하나를 권장한다.

### 11.3 환경변수 파일
토큰/키는 예시만 넣고 실제 값은 넣지 않는다.

```bash
cp .env.example .env
```

예시 키:
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DATABASE_URL`
- `OPENAI_API_KEY` 또는 다른 provider 키
- `DISCORD_WEBHOOK_URL` (하이브리드 게시를 쓸 경우)

## 12. 권장 작업 순서

### 첫째 날
1. OpenCode 설치
2. 저장소에 문서 배치
3. `/init`
4. `AGENTS.md`와 문서 검토
5. `/plan-feature MVP Discord bot skeleton`

### 둘째 날
1. Discord 봇 앱 생성
2. slash command 골격 구현
3. SQLite 모델/마이그레이션 구성
4. `/build-feature 브리핑 게시 MVP`

### 셋째 날
1. 퀴즈 저장/응답 처리
2. `/build-feature attempts 저장`
3. `/review-changes`

## 13. 로그 확인

문제가 생기면 아래부터 확인한다.

```bash
ls ~/.local/share/opencode/log/
tail -f ~/.local/share/opencode/log/<latest-log-file>
```

필요하면 더 자세한 로그 레벨로 실행한다.

```bash
opencode --log-level DEBUG
```

## 14. 협업 팁

- `AGENTS.md`는 Git에 커밋한다.
- 개인 취향 규칙은 `~/.config/opencode/AGENTS.md`에 둔다.
- 프로젝트 공통 규칙은 저장소 안 문서에 남긴다.
- 기능을 만들기 전에 `/plan-feature`를 먼저 돌리면 문서 일관성이 좋아진다.

## 15. 추천 시작 명령 모음

```bash
opencode
```

세션 안에서:
```text
/init
/plan-feature MVP 브리핑 게시
/build-feature MVP 브리핑 게시
/review-changes
```
