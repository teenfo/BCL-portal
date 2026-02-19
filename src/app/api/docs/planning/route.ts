import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

/**
 * GET /api/docs/planning?file=checkin-qr-system.md
 * 
 * .docs/archive/planning/ 디렉토리에서 기획 문서를 읽어 반환합니다.
 * Admin Changelog 모달에서 Priority 클릭 시 사용됩니다.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileName = searchParams.get('file');

        if (!fileName || !fileName.trim()) {
            return NextResponse.json(
                { error: '파일명이 지정되지 않았습니다.' },
                { status: 400 }
            );
        }

        // 보안: 디렉토리 트래버설 방지
        const sanitized = path.basename(fileName.trim());
        if (sanitized !== fileName.trim() || sanitized.includes('..')) {
            return NextResponse.json(
                { error: '잘못된 파일 경로입니다.' },
                { status: 400 }
            );
        }

        const filePath = path.join(process.cwd(), '.docs', 'archive', 'planning', sanitized);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return NextResponse.json({
                fileName: sanitized,
                content,
            });
        } catch {
            return NextResponse.json(
                { error: '기획 문서를 찾을 수 없습니다.' },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error('docs/planning GET error:', error);
        return NextResponse.json(
            { error: '문서 로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
