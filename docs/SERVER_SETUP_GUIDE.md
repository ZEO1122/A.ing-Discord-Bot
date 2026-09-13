# Server Setup Guide

이 문서는 이 저장소를 처음 보는 사람이 새 Discord 서버에 브리핑 자동화를 연결할 때 필요한 절차를 정리한다.

목표:
- concept 브리핑은 평일 오전 9시 KST에 자동 게시
- trend 브리핑은 월요일 오전 9시 KST에 채널별 관심분야 기준으로 자동 게시
- 자동화는 Google Apps Script + Discord Webhook으로 운영

## 1. 준비물

- GitHub public 저장소 접근 권한
- Google Apps Script 프로젝트 접근 권한
- Discord 서버 관리자 권한
- 게시할 Discord 채널 목록
- 채널별 webhook 생성 권한
- OpenAI API key
- Google Sheets 1개

## 2. Discord 서버에서 해야 할 일

### 2.1 concept 브리핑 채널 정하기
- concept 브리핑을 올릴 채널 1개를 정한다.

### 2.2 trend 브리핑 채널 정하기
- 관심분야별 채널을 정한다.
- 예:
  - `llm-brief`
  - `detection-segmentation-brief`
  - `vision-language-brief`

### 2.3 각 채널 webhook 만들기
1. 채널 설정 진입
2. `연동` / `Integrations`
3. `Webhook`
4. `새 웹훅 생성`
5. 이름 지정
6. `Webhook URL 복사`

필요한 webhook:
- concept 채널용 기본 webhook 1개
- trend 채널별 webhook 여러 개

## 3. Apps Script 설정

Apps Script 프로젝트 `Script Properties`에 아래 값을 넣는다.

- `DISCORD_WEBHOOK_URL`
- `DISCORD_WEBHOOK_MAP_JSON`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GITHUB_RAW_BASE_URL`
- `CONCEPT_MANIFEST_PATH`
- `CHANNEL_MAP_PATH`
- `TREND_HISTORY_SHEET_ID`
- `TREND_HISTORY_SHEET_NAME`

### `DISCORD_WEBHOOK_MAP_JSON` 예시

```yaml
llm-brief: https://discord.com/api/webhooks/<CHANNEL_ID>/<WEBHOOK_TOKEN>
detection-segmentation-brief: https://discord.com/api/webhooks/<CHANNEL_ID>/<WEBHOOK_TOKEN>
vision-language-brief: https://discord.com/api/webhooks/<CHANNEL_ID>/<WEBHOOK_TOKEN>
```

## 4. 채널 매핑 파일 수정

파일:
- `config/channel_interest_map.json`

taxonomy:
- `llm`
- `detection-segmentation`
- `vision-language`

예시:

```json
{
  "version": 1,
  "timezone": "Asia/Seoul",
  "channels": [
    {
      "channel_key": "llm-brief",
      "channel_id": "123456789012345678",
      "webhook_key": "llm-brief",
      "enabled": true,
      "interests": ["llm"],
      "max_topics": 1
    },
    {
      "channel_key": "detection-segmentation-brief",
      "channel_id": "234567890123456789",
      "webhook_key": "detection-segmentation-brief",
      "enabled": true,
      "interests": ["detection-segmentation"],
      "max_topics": 1
    },
    {
      "channel_key": "vision-language-brief",
      "channel_id": "345678901234567890",
      "webhook_key": "vision-language-brief",
      "enabled": true,
      "interests": ["vision-language"],
      "max_topics": 1
    }
  ]
}
```

## 5. concept 게시 순서 확인

파일:
- `content/concepts/manifest.json`

새 concept 추가 순서:
1. `content/concepts/dl-basics/`에 새 `.md` 추가
2. `manifest.json` 마지막에 경로 추가
3. `clasp push`

## 6. 첫 수동 검증

### 6.1 concept 검증
- Apps Script에서 `runConceptDaily()` 실행

정상이라면:
- concept 브리핑이 Discord에 올라감
- Script Properties progress 갱신

### 6.2 trend 검증
- Apps Script에서 `runTrendWeekly()` 실행

정상이라면:
- 해당 채널에 weekly trend 브리핑이 올라감
- Google Sheets `trend_history`가 갱신됨

## 7. 자동 스케줄 확인

Apps Script time trigger를 아래처럼 설정한다.

- concept: 평일 오전 9시 KST (`runConceptDaily`)
- trend: 월요일 오전 9시 KST (`runTrendWeekly`)

## 8. 운영 시작 전 최종 확인

- [ ] `DISCORD_WEBHOOK_URL` 설정 완료
- [ ] `DISCORD_WEBHOOK_MAP_JSON` 설정 완료
- [ ] `OPENAI_API_KEY` 설정 완료
- [ ] `OPENAI_MODEL` 설정 완료
- [ ] `TREND_HISTORY_SHEET_ID`와 `TREND_HISTORY_SHEET_NAME` 설정 완료
- [ ] `channel_interest_map.json` 실제 값 반영 완료
- [ ] concept 수동 실행 성공
- [ ] trend 수동 실행 성공 또는 의도된 skip 확인
- [ ] Script Properties progress 갱신 확인
- [ ] Google Sheets history 갱신 확인
