# A.ing Discord 학습 알림

AI 학술동아리를 위한 주간 논문 뉴스와 딥러닝 개념 알림이다. Cloudflare Worker와 D1을
사용하며 상시 서버·GAS·GitHub Actions를 운영 경로로 사용하지 않는다.

## 현재 상태

- 주간 뉴스: Hugging Face 주간 상위 3편 수집, OpenAI 요약, Discord 임베드 발행 구현.
  자동 생성 품질과 Free CPU 여유 검증이 남아 예약 발송은 비활성 상태다.
- 개념 알림: 12주 × 주 3회(월·수·금 09:00 한국시간), 총 36회 목차를 구성했다.
  대표 Markdown 3편과 검증·미리보기·발송 기록·학기 일정 고정을 구현했다.
  나머지 33편 집필과 콘텐츠 승인, 학기 시작일·시험 기간 확정이 남아 있다.
- 개념 콘텐츠는 미리 작성한 Markdown을 빌드해 배포한다. 발송 시 OpenAI/GitHub 조회 없음.

뉴스는 `DISCORD_WEBHOOK_URL`, 개념은 `CONCEPT_WEBHOOK_URL` 전용 채널로 발송한다.
개념 Webhook이 없으면 발송을 차단한다. [채널 설정](docs/CONCEPT_NOTIFICATIONS.md#채널-분리-설정)을 참고한다.

## 시작하기

Node 24를 사용한다. Markdown 예제 검증은 Python 3와 NumPy를 사용한다.

```bash
npm ci
npm run content:validate
npm run content:test
npm run content:examples
npm run content:preview
npm run content:build
npm run cf:typecheck
npm run cf:test
```

`content/dl-foundations/curriculum.yaml`에 전체 목차,
`content/dl-foundations/lessons/`에 개별 Markdown이 있다.
미리보기는 `artifacts/concepts/preview.html`에 생성된다.

```bash
npm run content:schedule -- config/semesters/example.yaml
npm run content:build -- --production
```

마지막 명령은 전체 36편이 작성·승인돼야 통과한다. 지금 실패하는 것은 정상이다.
예시 학기 설정은 실제 운영 일정이 아니며 파일 생성만으로 예약이 활성화되지 않는다.

## 운영 원칙

Git push와 배포를 분리한다. 검증된 내용을 커밋한 뒤 `npm run cf:deploy`로 검증 Worker에
반영한다. 현재 학기 운영과 뉴스 예약 게이트는 꺼져 있다.
API Key, Webhook, 관리 토큰은 `.env` 또는 Cloudflare Secrets로만 제공한다.
실제 키·토큰·발송 로그·로컬 아티팩트는 Git에 올리지 않는다.

새 공개 저장소에는 현재 파일의 새 이력만 올린다. 과거 레포의 Git 이력에는 민감정보
형태의 문자열이 있어 그 이력을 공개 저장소로 푸시하지 않는다.

## 문서

- [개념 알림 규격과 운영](docs/CONCEPT_NOTIFICATIONS.md)
- [주간 논문 파이프라인](docs/CLOUDFLARE_WEEKLY_PIPELINE.md)
- [Cloudflare 기술 검증](docs/CLOUDFLARE_TECH_PROBE.md)
- [구현 파일 구조](FILE_TREE.md)

기존 `apps-script/`, `src/` Python scaffold, `content/concepts/` 및 GAS 문서는 이전 구현의
참고 자료로 보존한다. 새 기능의 실행 경로는 `cloudflare/`와 위 개념 알림 문서를 따른다.
