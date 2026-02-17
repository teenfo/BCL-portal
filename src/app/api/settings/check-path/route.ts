import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

/**
 * GET /api/settings/check-path?path=public/uploads/coaches
 * Checks if the resolved directory exists on the filesystem.
 *
 * POST /api/settings/check-path  { "path": "public/uploads/coaches" }
 * Creates the directory (recursively) if it does not exist.
 */

function resolveDirPath(rawPath: string): string {
    if (path.isAbsolute(rawPath)) return rawPath;
    return path.join(process.cwd(), rawPath);
}

/* ─── GET: Check existence ─── */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const rawPath = searchParams.get('path');

        if (!rawPath || !rawPath.trim()) {
            return NextResponse.json({ error: '경로가 지정되지 않았습니다.' }, { status: 400 });
        }

        const resolved = resolveDirPath(rawPath.trim());

        try {
            const stat = await fs.stat(resolved);
            return NextResponse.json({
                exists: true,
                isDirectory: stat.isDirectory(),
                resolvedPath: resolved,
            });
        } catch {
            return NextResponse.json({
                exists: false,
                isDirectory: false,
                resolvedPath: resolved,
            });
        }
    } catch (error) {
        console.error('check-path GET error:', error);
        return NextResponse.json({ error: '경로 확인 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

/* ─── POST: Create directory ─── */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const rawPath = body.path as string;

        if (!rawPath || !rawPath.trim()) {
            return NextResponse.json({ error: '경로가 지정되지 않았습니다.' }, { status: 400 });
        }

        const resolved = resolveDirPath(rawPath.trim());

        // Safety: prevent directory traversal outside project root for relative paths
        const projectRoot = process.cwd();
        if (!path.isAbsolute(rawPath) && !resolved.startsWith(projectRoot)) {
            return NextResponse.json({ error: '프로젝트 루트 외부 경로는 생성할 수 없습니다.' }, { status: 403 });
        }

        await fs.mkdir(resolved, { recursive: true });

        return NextResponse.json({
            success: true,
            created: true,
            resolvedPath: resolved,
        });
    } catch (error) {
        console.error('check-path POST error:', error);
        return NextResponse.json({ error: '경로 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
