import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

interface SnapshotMeta {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    settingsCount: number;
}

interface Snapshot extends SnapshotMeta {
    settings: Record<string, string>;
}

/** Get snapshot directory from .env.local or use default */
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

/** Read current settings from .env.local */
async function getCurrentSettings(): Promise<Record<string, string>> {
    const settings: Record<string, string> = {};
    try {
        const content = await readFile(ENV_FILE_PATH, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = line.indexOf('=');
            if (eqIdx === -1) continue;
            const key = line.substring(0, eqIdx).trim();
            const value = line.substring(eqIdx + 1).trim();
            // Only include non-secret manageable keys
            if (!key.includes('SERVICE_ROLE') && !key.includes('SECRET')) {
                settings[key] = value;
            }
        }
    } catch { /* ignore */ }
    return settings;
}

// GET: List all snapshots
export async function GET() {
    try {
        const snapshotDir = await getSnapshotDir();
        await mkdir(snapshotDir, { recursive: true });

        const files = await readdir(snapshotDir);
        const snapshots: SnapshotMeta[] = [];

        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await readFile(path.join(snapshotDir, file), 'utf-8');
                const snap: Snapshot = JSON.parse(content);
                snapshots.push({
                    id: snap.id,
                    name: snap.name,
                    description: snap.description,
                    createdAt: snap.createdAt,
                    settingsCount: Object.keys(snap.settings).length,
                });
            } catch { /* skip corrupted files */ }
        }

        // Sort by date, newest first
        snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ success: true, snapshots, snapshotDir: await getSnapshotDir() });
    } catch (error) {
        console.error('Snapshot list error:', error);
        return NextResponse.json({ error: '스냅샷 목록을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

// POST: Create a new snapshot
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: '스냅샷 이름을 입력해주세요.' }, { status: 400 });
        }

        const snapshotDir = await getSnapshotDir();
        await mkdir(snapshotDir, { recursive: true });

        const settings = await getCurrentSettings();
        const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const snapshot: Snapshot = {
            id,
            name: name.trim(),
            description: description?.trim() || '',
            createdAt: new Date().toISOString(),
            settingsCount: Object.keys(settings).length,
            settings,
        };

        await writeFile(
            path.join(snapshotDir, `${id}.json`),
            JSON.stringify(snapshot, null, 2),
            'utf-8'
        );

        return NextResponse.json({ success: true, snapshot: { id, name: snapshot.name, description: snapshot.description, createdAt: snapshot.createdAt, settingsCount: snapshot.settingsCount } });
    } catch (error) {
        console.error('Snapshot create error:', error);
        return NextResponse.json({ error: '스냅샷 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

// DELETE: Delete a snapshot
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: '스냅샷 ID가 필요합니다.' }, { status: 400 });
        }

        const snapshotDir = await getSnapshotDir();
        const filePath = path.join(snapshotDir, `${id}.json`);

        // Safety: ensure path is within snapshot directory
        if (!filePath.startsWith(snapshotDir)) {
            return NextResponse.json({ error: '유효하지 않은 경로입니다.' }, { status: 400 });
        }

        try {
            await unlink(filePath);
        } catch {
            return NextResponse.json({ error: '스냅샷을 찾을 수 없습니다.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Snapshot delete error:', error);
        return NextResponse.json({ error: '스냅샷 삭제 중 오류가 발생했습니다.' }, { status: 500 });
    }
}
