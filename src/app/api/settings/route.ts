import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

// Settings that can be managed through the admin UI
// Keys starting with NEXT_PUBLIC_ are exposed to the client
const MANAGEABLE_KEYS = [
    // Image Upload - Base
    'UPLOAD_BASE_DIR',               // Base directory for file uploads (relative to project root or absolute)
    'UPLOAD_IMAGE_MAX_WIDTH',        // Max image width (px)
    'UPLOAD_IMAGE_MAX_HEIGHT',       // Max image height (px)
    'UPLOAD_IMAGE_QUALITY',          // Image compression quality (1-100)
    'UPLOAD_IMAGE_FORMAT',           // Output format (webp, jpeg, png)
    'UPLOAD_MAX_FILE_SIZE_MB',       // Max upload file size in MB

    // Image Upload - Per-Category Subdirectories
    'UPLOAD_SUBDIR_COACHES',         // Subdirectory for coach profile images
    'UPLOAD_SUBDIR_BANNERS',         // Subdirectory for banner images
    'UPLOAD_SUBDIR_FACILITIES',      // Subdirectory for facility images
    'UPLOAD_SUBDIR_MEMBERS',         // Subdirectory for member profile images
    'UPLOAD_SUBDIR_GENERAL',         // Subdirectory for general/misc images
    'UPLOAD_SUBDIR_CONTENT',         // Subdirectory for content/notice images
    'UPLOAD_SUBDIR_EVENTS',          // Subdirectory for event images
    'UPLOAD_SUBDIR_PRODUCTS',        // Subdirectory for product images

    // Snapshots
    'SETTINGS_SNAPSHOT_DIR',          // Directory for settings snapshots (not publicly accessible)

    // Site
    'NEXT_PUBLIC_SITE_NAME',         // Site display name
    'NEXT_PUBLIC_SITE_DESCRIPTION',  // Site description

    // Supabase (read-only display — prevent accidental edits)
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

// Keys that should be read-only in the UI
const READ_ONLY_KEYS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
];

interface EnvEntry {
    key: string;
    value: string;
    isComment: boolean;
    raw: string;
}

function parseEnvFile(content: string): EnvEntry[] {
    const lines = content.split('\n');
    return lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('#')) {
            return { key: '', value: '', isComment: true, raw: line };
        }
        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) {
            return { key: '', value: '', isComment: true, raw: line };
        }
        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        return { key, value, isComment: false, raw: line };
    });
}

function buildEnvFile(entries: EnvEntry[]): string {
    return entries.map((e) => {
        if (e.isComment) return e.raw;
        return `${e.key}=${e.value}`;
    }).join('\n');
}

// GET: Read current settings from .env.local
export async function GET() {
    try {
        let content = '';
        try {
            content = await readFile(ENV_FILE_PATH, 'utf-8');
        } catch {
            // File doesn't exist yet
            content = '';
        }

        const entries = parseEnvFile(content);

        // Build settings object with manageable keys
        const settings: Record<string, { value: string; readOnly: boolean; exists: boolean }> = {};

        for (const key of MANAGEABLE_KEYS) {
            const entry = entries.find((e) => !e.isComment && e.key === key);
            settings[key] = {
                value: entry?.value || getDefaultValue(key),
                readOnly: READ_ONLY_KEYS.includes(key),
                exists: !!entry,
            };
        }

        return NextResponse.json({
            success: true,
            settings,
            envPath: ENV_FILE_PATH,
        });
    } catch (error) {
        console.error('Settings read error:', error);
        return NextResponse.json(
            { error: '설정을 읽는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// PUT: Update settings in .env.local
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const updates: Record<string, string> = body.settings;

        if (!updates || typeof updates !== 'object') {
            return NextResponse.json(
                { error: '유효하지 않은 설정 데이터입니다.' },
                { status: 400 }
            );
        }

        // Filter out read-only keys
        const filteredUpdates: Record<string, string> = {};
        for (const [key, value] of Object.entries(updates)) {
            if (READ_ONLY_KEYS.includes(key)) continue;
            if (!MANAGEABLE_KEYS.includes(key)) continue;
            filteredUpdates[key] = value;
        }

        // Read current .env.local
        let content = '';
        try {
            content = await readFile(ENV_FILE_PATH, 'utf-8');
        } catch {
            content = '';
        }

        const entries = parseEnvFile(content);

        // Update existing entries or add new ones
        const updatedKeys = new Set<string>();
        for (let i = 0; i < entries.length; i++) {
            if (!entries[i].isComment && filteredUpdates[entries[i].key] !== undefined) {
                entries[i].value = filteredUpdates[entries[i].key];
                entries[i].raw = `${entries[i].key}=${entries[i].value}`;
                updatedKeys.add(entries[i].key);
            }
        }

        // Add new keys that don't exist yet
        const newKeys = Object.keys(filteredUpdates).filter((k) => !updatedKeys.has(k));
        if (newKeys.length > 0) {
            // Add a blank line separator if the file doesn't end with one
            if (entries.length > 0 && entries[entries.length - 1].raw.trim() !== '') {
                entries.push({ key: '', value: '', isComment: true, raw: '' });
            }
            entries.push({ key: '', value: '', isComment: true, raw: '# Portal Settings (관리자 설정)' });

            for (const key of newKeys) {
                entries.push({
                    key,
                    value: filteredUpdates[key],
                    isComment: false,
                    raw: `${key}=${filteredUpdates[key]}`,
                });
            }
        }

        // Write back
        const newContent = buildEnvFile(entries);
        await writeFile(ENV_FILE_PATH, newContent, 'utf-8');

        return NextResponse.json({
            success: true,
            message: '설정이 저장되었습니다. 일부 설정은 서버 재시작 후 적용됩니다.',
            updatedKeys: [...updatedKeys, ...newKeys],
            requiresRestart: newKeys.some(k => k.startsWith('NEXT_PUBLIC_')) || [...updatedKeys].some(k => k.startsWith('NEXT_PUBLIC_')),
        });
    } catch (error) {
        console.error('Settings write error:', error);
        return NextResponse.json(
            { error: '설정을 저장하는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

function getDefaultValue(key: string): string {
    const defaults: Record<string, string> = {
        UPLOAD_BASE_DIR: 'public/uploads',
        UPLOAD_IMAGE_MAX_WIDTH: '300',
        UPLOAD_IMAGE_MAX_HEIGHT: '300',
        UPLOAD_IMAGE_QUALITY: '85',
        UPLOAD_IMAGE_FORMAT: 'webp',
        UPLOAD_MAX_FILE_SIZE_MB: '5',
        UPLOAD_SUBDIR_COACHES: 'coaches',
        UPLOAD_SUBDIR_BANNERS: 'banners',
        UPLOAD_SUBDIR_FACILITIES: 'facilities',
        UPLOAD_SUBDIR_MEMBERS: 'members',
        UPLOAD_SUBDIR_GENERAL: 'general',
        UPLOAD_SUBDIR_CONTENT: 'content',
        UPLOAD_SUBDIR_EVENTS: 'events',
        UPLOAD_SUBDIR_PRODUCTS: 'products',
        SETTINGS_SNAPSHOT_DIR: '.settings-snapshots',
        NEXT_PUBLIC_SITE_NAME: 'BCL CrossFit Lounge',
        NEXT_PUBLIC_SITE_DESCRIPTION: 'BCL CrossFit Lounge Admin Portal',
    };
    return defaults[key] || '';
}
