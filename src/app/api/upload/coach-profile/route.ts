import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Read upload settings from .env.local (or use defaults)
async function getUploadConfig() {
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
    const coachSubdir = envVars['UPLOAD_SUBDIR_COACHES'] || 'coaches';
    const maxWidth = parseInt(envVars['UPLOAD_IMAGE_MAX_WIDTH'] || '300', 10);
    const maxHeight = parseInt(envVars['UPLOAD_IMAGE_MAX_HEIGHT'] || '300', 10);
    const quality = parseInt(envVars['UPLOAD_IMAGE_QUALITY'] || '85', 10);
    const format = (envVars['UPLOAD_IMAGE_FORMAT'] || 'webp') as 'webp' | 'jpeg' | 'png';
    const maxFileSizeMB = parseInt(envVars['UPLOAD_MAX_FILE_SIZE_MB'] || '5', 10);

    // Determine if baseDir is absolute or relative
    const isAbsolute = path.isAbsolute(baseDir);
    const resolvedBaseDir = isAbsolute ? baseDir : path.join(process.cwd(), baseDir);

    // Determine the public URL prefix
    // If baseDir starts with "public/", the URL is the remainder after "public"
    // Otherwise (absolute path or outside public), we need to handle differently
    let urlPrefix = '';
    if (baseDir.startsWith('public/') || baseDir.startsWith('public\\')) {
        urlPrefix = '/' + baseDir.substring('public/'.length);
    } else if (baseDir === 'public') {
        urlPrefix = '/';
    } else {
        // For absolute paths outside public, we'll still try to serve via Next.js
        // but the user should be aware this requires additional configuration
        urlPrefix = '/uploads';
    }

    return {
        uploadDir: path.join(resolvedBaseDir, coachSubdir),
        urlPrefix: urlPrefix.endsWith('/') ? urlPrefix + coachSubdir : urlPrefix + '/' + coachSubdir,
        maxWidth,
        maxHeight,
        quality,
        format,
        maxFileSizeMB,
    };
}

export async function POST(request: NextRequest) {
    try {
        const config = await getUploadConfig();

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const coachId = formData.get('coachId') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: '이미지 파일이 필요합니다.' },
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
        const maxSize = config.maxFileSizeMB * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: `이미지 크기가 ${config.maxFileSizeMB}MB를 초과합니다.` },
                { status: 400 }
            );
        }

        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Process image with sharp: resize and convert
        let sharpPipeline = sharp(buffer)
            .resize(config.maxWidth, config.maxHeight, {
                fit: 'cover',
                position: 'center',
            });

        // Apply format conversion
        const ext = config.format;
        switch (config.format) {
            case 'webp':
                sharpPipeline = sharpPipeline.webp({ quality: config.quality });
                break;
            case 'jpeg':
                sharpPipeline = sharpPipeline.jpeg({ quality: config.quality });
                break;
            case 'png':
                sharpPipeline = sharpPipeline.png({ quality: config.quality });
                break;
        }

        const processedBuffer = await sharpPipeline.toBuffer();

        // Generate unique filename
        const filename = `${coachId || randomUUID()}_${Date.now()}.${ext}`;

        // Ensure upload directory exists
        await mkdir(config.uploadDir, { recursive: true });

        // Write file
        const filePath = path.join(config.uploadDir, filename);
        await writeFile(filePath, processedBuffer);

        // Return the public URL
        const publicUrl = `${config.urlPrefix}/${filename}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            filename,
            size: processedBuffer.length,
            dimensions: {
                width: config.maxWidth,
                height: config.maxHeight,
            },
            format: config.format,
        });
    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { error: '이미지 업로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// DELETE endpoint to remove coach profile image
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

        // Resolve file path from URL
        // If URL starts with /uploads, map to the configured upload directory
        const config = await getUploadConfig();
        let filePath: string;

        if (imageUrl.startsWith(config.urlPrefix)) {
            const relativePath = imageUrl.substring(config.urlPrefix.length);
            filePath = path.join(config.uploadDir, relativePath);
        } else if (imageUrl.startsWith('/uploads/')) {
            // Legacy path fallback
            filePath = path.join(process.cwd(), 'public', imageUrl);
        } else {
            return NextResponse.json(
                { error: '유효하지 않은 이미지 경로입니다.' },
                { status: 400 }
            );
        }

        // Delete file (ignore if not found)
        const { unlink } = await import('fs/promises');
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
