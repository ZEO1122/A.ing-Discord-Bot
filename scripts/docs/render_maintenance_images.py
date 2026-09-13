"""Render original explanatory diagrams, not screenshots (Python 3 + Pillow)."""
from pathlib import Path
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/images/maintenance'
FONT = os.environ.get('MAINTENANCE_FONT', '/System/Library/Fonts/AppleSDGothicNeo.ttc')
CARDS = [
 ('01-migration', '개인 계정에서 동아리 운영으로', '한 번에 이전하지 않고, 새 환경 검증 후 전환합니다.', [
  ('1. 소유자와 권한', 'GitHub Organization · Cloudflare 계정\nOpenAI Project · Discord 관리 담당자'),
  ('2. 기존 실행 중지', '게이트와 cron 중단 · 진행 중 Workflow 확인\nD1 전체 백업과 발송 이력 보존'),
  ('3. 새 환경 구성', '새 D1 복원 · Worker와 Workflow 바인딩\n새 Secrets 등록 · 발송은 아직 중지'),
  ('4. 검증 후 전환', '두 채널 테스트 · DB 이력 비교\n정상 확인 후 개인 권한과 이전 키 정리')]),
 ('02-secrets', 'Secrets와 Discord 채널 연결', '값을 문서에 적지 않습니다. 이름과 목적만 확인합니다.', [
  ('OPENAI_API_KEY', '뉴스 요약 생성에 사용\n동아리 OpenAI 프로젝트에서 발급'),
  ('ADMIN_TOKEN', '관리 API 접근 인증\n담당자 PC와 Worker의 토큰 일치 확인'),
  ('DISCORD_WEBHOOK_URL', '이번주 AI 뉴스 채널 전용\n다른 채널의 Webhook과 혼용하지 않기'),
  ('CONCEPT_WEBHOOK_URL', '딥러닝 개념 채널 전용\n.env 수정 후 원격 Secrets도 별도 등록')]),
 ('03-content', '원고 수정 → 검수 → 배포', 'GitHub 편집과 실제 알림 반영은 별도 단계입니다.', [
  ('1. Markdown 수정', 'lessons/에서 본문 수정 · version 갱신\n승인된 원고를 바꾸면 draft로 재검수'),
  ('2. 로컬 확인', 'validate · test · examples · preview\n내용과 숫자, 출처, Discord 길이 확인'),
  ('3. 검수 기록', '검수 완료 후 approved · 최종 SHA-256 기록\n운영 빌드는 36편 전체 승인 필요'),
  ('4. 반영', 'build · 커밋과 push · 계정 확인 · deploy\n기존 학기의 고정 payload는 자동 교체 안 됨')]),
 ('04-semester', '36회 학기 일정 준비', '현재 시작일 미정 · 예약 비활성 · 아래는 준비 절차입니다.', [
  ('1. 학기 파일', 'example.yaml을 새 학기 파일로 복사\n고유 id와 확정한 start_date 지정'),
  ('2. 요일과 시간', '월 · 수 · 금 = [1, 3, 5]\nAsia/Seoul 09:00 = UTC 00:00'),
  ('3. 시험 기간', 'breaks의 start부터 end까지 포함해 휴강\n36회를 유지하며 이후 발송일로 이동'),
  ('4. 활성화 전 확인', '일정 36개 확인 · 콘텐츠 전체 검수\n등록 도구와 뉴스/개념 cron 분기 검증 필요')]),
 ('05-recovery', '알림 장애 대응 순서', '불확실한 전송은 재실행 전에 실제 메시지와 대조합니다.', [
  ('1. 확대 방지', '해당 생성·발송 게이트와 cron 중단\n진행 중 Workflow는 별도로 확인'),
  ('2. 증거 확인', '대상 주차 또는 lesson ID · 오류 코드\nDiscord 메시지와 D1 delivery 상태 비교'),
  ('3. 원인 해결', '인증 · 사용 한도 · CPU · 일정 · 콘텐츠\nunknown 기록 삭제 후 재발송 금지'),
  ('4. 복구 검증', '백업 이후 발송 이력 보존\n코드 복구와 DB 복구를 따로 검토')]),
]

def font(size):
 return ImageFont.truetype(FONT, size)

def render(name, title, subtitle, cards):
 im=Image.new('RGB',(1440,1000),'#f3f6fa'); d=ImageDraw.Draw(im)
 d.text((64,40),'A.ing  /  운영 인수인계',font=font(25),fill='#386b85')
 d.text((64,87),title,font=font(48),fill='#142c42')
 d.text((64,155),subtitle,font=font(27),fill='#4c6074')
 for i,(heading,body) in enumerate(cards):
  x=64+(i%2)*670;y=230+(i//2)*310
  d.rounded_rectangle((x,y,x+640,y+278),radius=22,fill='white',outline='#d4dee8',width=2)
  d.rounded_rectangle((x+25,y+26,x+615,y+34),radius=4,fill='#398aa0')
  d.text((x+28,y+63),heading,font=font(34),fill='#153f56')
  for j,line in enumerate(body.split('\n')):
   assert d.textlength(line,font=font(26)) < 590, (name,line)
   d.text((x+28,y+130+j*46),line,font=font(26),fill='#304a61')
 d.text((64,918),'설명용 도식 · 실제 화면 캡처 아님   |   확인일 2026-09-13',font=font(23),fill='#52677b')
 OUT.mkdir(parents=True,exist_ok=True); im.save(OUT/(name+'.png'))

if __name__=='__main__':
 for row in CARDS: render(*row)
 print(f'Rendered {len(CARDS)} diagrams to {OUT}')
