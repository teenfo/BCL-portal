import { NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir } from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

async function getSnapshotDir(): Promise<string> {
    try {
        const content = await readFile(ENV_FILE_PATH, 'utf-8');
        const match = content.match(/^SETTINGS_SNAPSHOT_DIR=(.+)$/m);
        if (match) {
            const dir = match[1].trim();
            return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
        }
    } catch { /* ignore */ }
    return path.join(process.cwd(), '.settings-snapshots');
}

// GET: Retrieve a specific snapshot's full data (including settings)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: '스냅샷 ID가 필요합니다.' }, { status: 400 });
        }

        const snapshotDir = await getSnapshotDir();
        await mkdir(snapshotDir, { recursive: true });

        const filePath = path.join(snapshotDir, `${id}.json`);

        // Safety check
        if (!filePath.startsWith(snapshotDir)) {
            return NextResponse.json({ error: '유효하지 않은 경로입니다.' }, { status: 400 });
        }

        try {
            const content = await readFile(filePath, 'utf-8');
            const snapshot = JSON.parse(content);
            return NextResponse.json({ success: true, snapshot });
        } catch {
            return NextResponse.json({ error: '스냅샷을 찾을 수 없습니다.' }, { status: 404 });
        }
    } catch (error) {
        console.error('Snapshot read error:', error);
        return NextResponse.json({ error: '스냅샷을 읽는 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
