// 배포 헬스체크 전용 엔드포인트 (docs/11 §5 — deploy.sh가 200 확인)
export function GET() {
  return new Response('ok', { status: 200 });
}
