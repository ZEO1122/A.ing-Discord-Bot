# GAS Final Checklist

이 문서는 실제 운영을 시작하기 전에 **마지막으로 확인해야 할 항목만** 짧게 정리한 체크리스트다.

## 1. Apps Script 설정

- [ ] `DISCORD_WEBHOOK_URL` 입력 완료
- [ ] `DISCORD_WEBHOOK_MAP_JSON` 입력 완료
- [ ] `OPENAI_API_KEY` 입력 완료
- [ ] `OPENAI_MODEL=gpt-5.1` 확인
- [ ] `GITHUB_RAW_BASE_URL` 입력 완료
- [ ] `CONCEPT_MANIFEST_PATH=content/concepts/manifest.json` 확인
- [ ] `CHANNEL_MAP_PATH=config/channel_interest_map.json` 확인
- [ ] `TREND_HISTORY_SHEET_ID` 입력 완료
- [ ] `TREND_HISTORY_SHEET_NAME=trend_history` 확인

## 2. Discord 채널 설정

- [ ] concept 채널 webhook 생성 완료
- [ ] `llm-brief` webhook 생성 완료
- [ ] `detection-segmentation-brief` webhook 생성 완료
- [ ] `vision-language-brief` webhook 생성 완료
- [ ] 각 webhook이 올바른 채널을 가리키는지 확인

## 3. GitHub 저장소 설정

- [ ] `content/concepts/manifest.json` 순서 확인
- [ ] `config/channel_interest_map.json` 채널 ID 확인
- [ ] `config/channel_interest_map.json`의 `enabled: true` 확인
- [ ] 관심분야가 `llm`, `detection-segmentation`, `vision-language` 기준으로 설정됨

## 4. 데이터 저장소 확인

- [ ] Google Sheets `trend_history` 시트 생성 완료
- [ ] 시트 헤더가 아래 순서와 일치함

```text
channel_key | channel_id | interest | source_url | source_title | published_at | posted_at | brief_title
```

- [ ] concept progress는 Script Properties에서 관리됨

## 5. 수동 실행 확인

- [ ] `runConceptDaily()` 성공
- [ ] Discord concept 채널에 concept full embed 게시 확인
- [ ] `runTrendWeekly()` 성공
- [ ] trend 채널에 브리핑 또는 정상 skip 확인
- [ ] Google Sheets `trend_history`에 기록 생성 확인

## 6. 로그 확인

- [ ] Apps Script `Executions`에서 concept 실행 로그 확인
- [ ] Apps Script `Executions`에서 trend 실행 로그 확인
- [ ] OpenAI 응답/Discord 전송 관련 에러가 없는지 확인

## 7. 자동 운영 전환

- [ ] `runConceptDaily` 트리거를 평일 오전 9시 KST로 설정
- [ ] `runTrendWeekly` 트리거를 월요일 오전 9시 KST로 설정
- [ ] 첫 자동 실행 이후 Discord 게시와 history 기록을 다시 확인

## 8. 한 줄 결론

위 항목이 모두 완료되면, 이 저장소는 **GAS 기반 자동 브리핑 운영 상태**로 본다.
