import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Default per-category image processing configs (subdir comes from settings)
const CATEGORY_DEFAULTS: Record<string, {
    defaultSubdir: string;
    settingsKey: string;  // key in .env.local for subdir override
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
    fit: 'cover' | 'contain' | 'inside';
}> = {
    coaches: {
        defaultSubdir: 'coaches',
        settingsKey: 'UPLOAD_SUBDIR_COACHES',
        maxWidth: 400,
        maxHeight: 400,
        quality: 85,
        format: 'webp',
        fit: 'cover',
    },
    banner: {
        defaultSubdir: 'banners',
        settingsKey: 'UPLOAD_SUBDIR_BANNERS',
        maxWidth: 1920,
        maxHeight: 600,
        quality: 85,
        format: 'webp',
        fit: 'cover',
    },
    facility: {
        defaultSubdir: 'facilities',
        settingsKey: 'UPLOAD_SUBDIR_FACILITIES',
        maxWidth: 1200,
        maxHeight: 800,
        quality: 85,
        format: 'webp',
        fit: 'cover',
    },
    member: {
        defaultSubdir: 'members',
        settingsKey: 'UPLOAD_SUBDIR_MEMBERS',
        maxWidth: 400,
        maxHeight: 400,
        quality: 85,
        format: 'webp',
        fit: 'cover',
    },
    content: {
        defaultSubdir: 'content',
        settingsKey: 'UPLOAD_SUBDIR_CONTENT',
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 85,
        format: 'webp',
        fit: 'inside',
    },
    events: {
        defaultSubdir: 'events',
        settingsKey: 'UPLOAD_SUBDIR_EVENTS',
        maxWidth: 1200,
        maxHeight: 800,
        quality: 85,
        format: 'webp',
        fit: 'cover',
    },
    products: {
        defaultSubdir: 'products',
        settingsKey: 'UPLOAD_SUBDIR_PRODUCTS',
        maxWidth: 800,
        maxHeight: 800,
        quality: 85,
        format: 'webp',
        fit: 'cover',
    },
    general: {
        defaultSubdir: 'general',
        settingsKey: 'UPLOAD_SUBDIR_GENERAL',
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 85,
        format: 'webp',
        fit: 'inside',
    },
};

/**
 * Read all upload-related settings from .env.local
 * Returns baseDir info + per-category subdirs
 */
async function getUploadSettings() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envVars: Record<string, string> = {};

    try {
        const content = await readFile(envPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed.startsWith('#')) continue;
            const eqIndex = line.indexOf('=');
            if (eqIndex === -1) continue;
            envVars[line.substring(0, eqIndex).trim()] = line.substring(eqIndex + 1).trim();
        }
    } catch {
        // .env.local not found — use defaults
    }

    const baseDir = envVars['UPLOAD_BASE_DIR'] || 'public/uploads';
    const isAbsolute = path.isAbsolute(baseDir);
    const resolvedBaseDir = isAbsolute ? baseDir : path.join(process.cwd(), baseDir);

    let urlPrefix = '';
    if (baseDir.startsWith('public/') || baseDir.startsWith('public\\')) {
        urlPrefix = '/' + baseDir.substring('public/'.length);
    } else if (baseDir === 'public') {
        urlPrefix = '/';
    } else {
        urlPrefix = '/uploads';
    }

    // Read global image settings overrides
    const globalMaxWidth = envVars['UPLOAD_IMAGE_MAX_WIDTH'] ? parseInt(envVars['UPLOAD_IMAGE_MAX_WIDTH'], 10) : undefined;
    const globalMaxHeight = envVars['UPLOAD_IMAGE_MAX_HEIGHT'] ? parseInt(envVars['UPLOAD_IMAGE_MAX_HEIGHT'], 10) : undefined;
    const globalQuality = envVars['UPLOAD_IMAGE_QUALITY'] ? parseInt(envVars['UPLOAD_IMAGE_QUALITY'], 10) : undefined;
    const globalFormat = envVars['UPLOAD_IMAGE_FORMAT'] as 'webp' | 'jpeg' | 'png' | undefined;
    const globalMaxFileSizeMB = envVars['UPLOAD_MAX_FILE_SIZE_MB'] ? parseInt(envVars['UPLOAD_MAX_FILE_SIZE_MB'], 10) : 10;

    return { resolvedBaseDir, urlPrefix, envVars, globalMaxWidth, globalMaxHeight, globalQuality, globalFormat, globalMaxFileSizeMB };
}

/**
 * Resolve the subdir for a given category using settings, then defaults.
 * Also supports dynamic categories not in CATEGORY_DEFAULTS — any UPLOAD_SUBDIR_XYZ key.
 */
function resolveCategory(category: string, envVars: Record<string, string>) {
    const categoryKey = category.toLowerCase();
    const catConfig = CATEGORY_DEFAULTS[categoryKey];

    if (catConfig) {
        // Known category: use settings override or default subdir
        const subdir = envVars[catConfig.settingsKey] || catConfig.defaultSubdir;
        return { ...catConfig, subdir };
    }

    // Dynamic category: look for UPLOAD_SUBDIR_{CATEGORY} in settings
    const dynamicKey = `UPLOAD_SUBDIR_${categoryKey.toUpperCase()}`;
    const dynamicSubdir = envVars[dynamicKey];
    if (dynamicSubdir) {
        // Dynamic category found in settings — use general/fallback processing config
        return {
            subdir: dynamicSubdir,
            settingsKey: dynamicKey,
            defaultSubdir: dynamicSubdir,
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 85,
            format: 'webp' as const,
            fit: 'inside' as const,
        };
    }

    // Unknown category — default to 'general'
    return null;
}

export async function POST(request: NextRequest) {
    try {
        const settings = await getUploadSettings();
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const category = (formData.get('category') as string) || 'general';
        const entityId = formData.get('entityId') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: '이미지 파일이 필요합니다.' },
                { status: 400 }
            );
        }

        // Validate category
        const config = resolveCategory(category, settings.envVars);
        if (!config) {
            return NextResponse.json(
                { error: `지원되지 않는 카테고리입니다. (${Object.keys(CATEGORY_DEFAULTS).join(', ')})` },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: '지원되지 않는 이미지 형식입니다. (JPG, PNG, WebP, GIF만 가능)' },
                { status: 400 }
            );
        }

        // Validate file size
        const maxSize = settings.globalMaxFileSizeMB * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `이미지 크기가 ${settings.globalMaxFileSizeMB}MB를 초과합니다.` },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Apply global overrides if present
        const finalWidth = settings.globalMaxWidth || config.maxWidth;
        const finalHeight = settings.globalMaxHeight || config.maxHeight;
        const finalQuality = settings.globalQuality || config.quality;
        const finalFormat = settings.globalFormat || config.format;

        // Process image with sharp
        let sharpPipeline = sharp(buffer)
            .resize(finalWidth, finalHeight, {
                fit: config.fit,
                position: 'center',
                withoutEnlargement: true,
            });

        const ext = finalFormat;
        switch (finalFormat) {
            case 'webp':
                sharpPipeline = sharpPipeline.webp({ quality: finalQuality });
                break;
            case 'jpeg':
                sharpPipeline = sharpPipeline.jpeg({ quality: finalQuality });
                break;
            case 'png':
                sharpPipeline = sharpPipeline.png({ quality: finalQuality });
                break;
        }

        const processedBuffer = await sharpPipeline.toBuffer();
        const metadata = await sharp(processedBuffer).metadata();

        // Generate unique filename
        const filename = `${entityId || randomUUID()}_${Date.now()}.${ext}`;

        // Ensure upload directory exists
        const uploadDir = path.join(settings.resolvedBaseDir, config.subdir);
        await mkdir(uploadDir, { recursive: true });

        // Write file
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, processedBuffer);

        // Return the public URL
        const subPrefix = settings.urlPrefix.endsWith('/') ? settings.urlPrefix + config.subdir : settings.urlPrefix + '/' + config.subdir;
        const publicUrl = `${subPrefix}/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename,
            size: processedBuffer.length,
            dimensions: {
                width: metadata.width,
                height: metadata.height,
            },
            format: finalFormat,
            category,
            subdir: config.subdir,
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { error: '이미지 업로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return NextResponse.json(
                { error: '삭제할 이미지 URL이 필요합니다.' },
                { status: 400 }
            );
        }

        const settings = await getUploadSettings();
        let filePath: string;

        if (imageUrl.startsWith(settings.urlPrefix)) {
            const relativePath = imageUrl.substring(settings.urlPrefix.length);
            filePath = path.join(settings.resolvedBaseDir, relativePath);
        } else if (imageUrl.startsWith('/uploads/')) {
            filePath = path.join(process.cwd(), 'public', imageUrl);
        } else {
            return NextResponse.json(
                { error: '유효하지 않은 이미지 경로입니다.' },
                { status: 400 }
            );
        }

        try {
            await unlink(filePath);
        } catch {
            // File may not exist
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Image delete error:', error);
        return NextResponse.json(
            { error: '이미지 삭제 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
