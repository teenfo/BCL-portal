import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * BCL Portal - 카카오 알림톡/SMS 발송 Edge Function
 *
 * ⚠️ 운영 상태: MOCK (v1 제외)
 *   - 카카오 비즈메시지: 실제 API 미연동. 로그만 출력하고 성공 응답 반환.
 *   - SMS: 실제 API 미연동. 로그만 출력하고 성공 응답 반환.
 *   - 실제 연동 시: 아래 주석 처리된 fetch() 코드 활성화 필요.
 *
 * 실제 연동을 위한 준비물:
 *   - KAKAO_API_KEY: 카카오 비즈메시지 계약 후 API 키 발급
 *   - SMS_API_KEY: SMS 서비스(알리고/네이버 SENS 등) API 키
 *   - SMS_SENDER: 발신 번호 (사전 등록 필요)
 *
 * 참고: Priority 14 (알림 시스템 실 가동 QA) — 운영 환경 의존 대기
 */

const KAKAO_API_KEY = Deno.env.get('KAKAO_API_KEY') || '';
const SMS_API_KEY = Deno.env.get('SMS_API_KEY') || '';
const SMS_SENDER = Deno.env.get('SMS_SENDER') || '';

interface SendRequest {
    channel: 'kakao' | 'sms';
    phone: string;
    templateCode?: string;
    message: string;
    params?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        const payload: SendRequest = await req.json();
        const { channel, phone, message, templateCode, params } = payload;

        if (!phone || !message) {
            return new Response(JSON.stringify({ error: 'phone and message are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (channel === 'kakao') {
            // ── 카카오 알림톡 발송 ──
            if (!KAKAO_API_KEY) {
                return new Response(JSON.stringify({ error: 'KAKAO_API_KEY not configured' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // 카카오 비즈메시지 API 호출
            // 실제 API 엔드포인트는 계약된 서비스에 따라 다름
            const kakaoPayload = {
                template_code: templateCode || 'default',
                phone: phone.replace(/-/g, ''),
                params: params || {},
                message_text: message,
            };

            // Example: 실제 카카오 API 엔드포인트로 교체 필요
            // const response = await fetch('https://api.kakao.com/v1/api/send', {
            //   method: 'POST',
            //   headers: {
            //     'Authorization': `Bearer ${KAKAO_API_KEY}`,
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify(kakaoPayload),
            // });

            // Mock success for now
            console.log('[KAKAO] Would send:', kakaoPayload);

            return new Response(JSON.stringify({
                success: true,
                channel: 'kakao',
                phone,
                message: 'Kakao message queued (mock)',
            }), {
                headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
            });

        } else if (channel === 'sms') {
            // ── SMS 발송 ──
            if (!SMS_API_KEY || !SMS_SENDER) {
                return new Response(JSON.stringify({ error: 'SMS credentials not configured' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const smsPayload = {
                from: SMS_SENDER,
                to: phone.replace(/-/g, ''),
                text: message,
            };

            // Example: 실제 SMS API 엔드포인트로 교체 필요 (예: 알리고, 네이버 클라우드, etc.)
            // const response = await fetch('https://sms-api.example.com/send', {
            //   method: 'POST',
            //   headers: {
            //     'Authorization': `Bearer ${SMS_API_KEY}`,
            //     'Content-Type': 'application/json',
            //   },
            //   body: JSON.stringify(smsPayload),
            // });

            // Mock success
            console.log('[SMS] Would send:', smsPayload);

            return new Response(JSON.stringify({
                success: true,
                channel: 'sms',
                phone,
                message: 'SMS queued (mock)',
            }), {
                headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
            });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid channel. Use "kakao" or "sms".' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (err) {
        console.error('Error:', err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
