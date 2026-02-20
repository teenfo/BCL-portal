#!/usr/bin/env node
/**
 * BCL Portal Multi-Agent CLI Wrapper
 * 
 * /develop 워크플로우에 정의된 5개 관점(Role)에 따라
 * Claude Code CLI 또는 Gemini CLI를 자동으로 선택하여 호출합니다.
 * 
 * 사용법:
 *   npm run agent -- --role=dev --task="API 라우트 구현해줘"
 *   npm run agent -- --role=architect --task="보안 점검해줘"
 *   npm run agent -- --list
 * 
 * 인증:
 *   🟣 Claude 모델: Anthropic Pro 구독 (OAuth 로그인)
 *   🔵 Gemini 모델: GEMINI_API_KEY 환경변수
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ─── 인자 파싱 ───
const args = process.argv.slice(2);
let role = '';
let task = '';
let listRoles = false;

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--role=')) {
        role = args[i].split('=')[1];
    } else if (args[i].startsWith('--task=')) {
        task = args[i].split('=')[1];
    } else if (args[i] === '--role' && args[i + 1]) {
        role = args[++i];
    } else if (args[i] === '--task' && args[i + 1]) {
        task = args[++i];
    } else if (args[i] === '--list') {
        listRoles = true;
    } else {
        task += (task ? ' ' : '') + args[i];
    }
}

// ─── 에이전트 롤 정의 (/develop 워크플로우 기준) ───
const ROLES = {
    architect: {
        name: '🏛️ Architect',
        cli: 'gemini',
        model: 'gemini-2.5-pro',
        description: '작업 선택, 설계 검토, 아키텍처 일관성 확인 및 최종 승인',
        systemPrompt: `당신은 BCL Portal 프로젝트의 Architect입니다.
- 전체 시스템 아키텍처 설계, 보안 검증, 최종 리뷰 및 승인을 담당합니다.
- 작업 선택과 설계 검토, 아키텍처 일관성 확인에 집중하세요.
- 코드 수정보다는 구조적 판단과 리뷰에 집중하세요.`,
        readFiles: [
            '.agent/rules/bcl-portal.rules.md',
            '.docs/database-reference.md',
            '.docs/security/README.md',
        ]
    },
    senior: {
        name: '💎 Senior Dev',
        cli: 'claude',
        model: 'opus',
        description: 'DB 스키마 설계, RLS 보안 정책 구현, 복잡한 비즈니스 로직',
        systemPrompt: `당신은 BCL Portal의 시니어 개발자(Senior Developer)입니다.
- DB 스키마 설계, RLS 보안 정책 구현, 복잡한 비즈니스 로직을 전담합니다.
- 결제/재무(admin/finance) 등 고난이도 로직에 집중합니다.
- 데이터 무결성과 트랜잭션 안전성을 최우선으로 합니다.`,
        readFiles: [
            '.agent/rules/bcl-portal.rules.md',
            '.docs/database-reference.md',
            '.docs/security/README.md',
        ]
    },
    'ui-dev': {
        name: '🎨 UI Developer',
        cli: 'gemini',
        model: 'gemini-2.5-pro',
        description: '디자인 시스템 준수, 프리미엄 UI(Glassmorphism) 구현',
        systemPrompt: `당신은 BCL Portal의 UI Developer입니다.
- 디자인 시스템과 Glassmorphism 가이드라인을 완벽히 따르세요.
- Admin 페이지에서는 반드시 글로벌 CSS 클래스를 사용하세요.
- Apps(사용자) 화면은 모바일 퍼스트, Admin은 데스크탑 중심으로 구현하세요.
- CSS 변수를 사용하고 하드코딩하지 마세요.`,
        readFiles: [
            '.agent/rules/ui.rules.md',
            '.agent/skills/ui-gen/SKILL.md',
            '.docs/design-system.md',
        ]
    },
    dev: {
        name: '💻 Developer',
        cli: 'claude',
        model: 'sonnet',
        description: 'API 연동, 일반 로직 구현, 빌드 검증, 문서/컨텍스트 동기화',
        systemPrompt: `당신은 BCL Portal의 Developer입니다.
- API 연동, 일반 로직 구현, 빌드 검증에 집중하세요.
- Supabase RPC, API Route 구현, TypeScript 타입 안전성을 유지하세요.
- RLS 정책을 항상 고려하고, 안정성을 최우선으로 하세요.
- 문서/컨텍스트 동기화도 담당합니다.`,
        readFiles: [
            '.agent/rules/bcl-portal.rules.md',
            '.docs/database-reference.md',
        ]
    },
    specialist: {
        name: '⚡ Specialist',
        cli: 'gemini',
        model: 'gemini-2.5-flash',
        description: '실시간 엔드포인트 연동, 코드-문서 단순 대조, 빠른 작업',
        systemPrompt: `당신은 BCL Portal의 Specialist입니다.
- 실시간 엔드포인트 연동, WebSocket, 하드웨어 연동 등 퍼포먼스 작업을 담당합니다.
- 코드-문서 단순 대조, 빠른 검증 작업에 집중하세요.
- 속도와 정확성을 최우선으로 합니다.`,
        readFiles: [
            '.agent/rules/bcl-portal.rules.md',
        ]
    }
};

// ─── --list ───
if (listRoles) {
    console.log('\n🤖 [BCL-AGENT] 사용 가능한 역할 (/develop 워크플로우 기준):\n');
    for (const [key, r] of Object.entries(ROLES)) {
        const cliLabel = r.cli === 'claude' ? '🟣 Claude' : '🔵 Gemini';
        console.log(`  --role=${key.padEnd(12)} ${r.name.padEnd(22)} [${cliLabel} ${r.model}]`);
        console.log(`  ${''.padEnd(14)} ${r.description}\n`);
    }
    console.log('💡 사용 예시:');
    console.log('  npm run agent -- --role=dev --task="API 라우트 구현해줘"');
    console.log('  npm run agent -- --role=ui-dev --task="대시보드 UI 고쳐줘"');
    console.log('  npm run agent -- --role=architect --task="보안 점검해줘"\n');
    process.exit(0);
}

// ─── 유효성 검사 ───
if (!role) {
    console.log('\n❌ 역할(Role)을 지정해주세요.');
    console.log(`📌 npm run agent -- --role=[${Object.keys(ROLES).join('|')}] --task="작업"`);
    console.log('📋 npm run agent -- --list\n');
    process.exit(1);
}
if (!task) {
    console.log(`\n❌ 작업(Task) 내용이 비어 있습니다.`);
    console.log(`📌 npm run agent -- --role=${role} --task="작업 내용"\n`);
    process.exit(1);
}
const selectedRole = ROLES[role];
if (!selectedRole) {
    console.log(`\n❌ 알 수 없는 롤: "${role}" → 지원: ${Object.keys(ROLES).join(', ')}\n`);
    process.exit(1);
}

// ─── 프롬프트 조합 ───
let fullPrompt = selectedRole.systemPrompt + '\n\n';

for (const doc of selectedRole.readFiles) {
    const fullPath = path.resolve(process.cwd(), doc);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        const truncated = lines.length > 300 ? lines.slice(0, 300).join('\n') + '\n...(truncated)' : content;
        fullPrompt += `\n--- ${doc} ---\n${truncated}\n`;
    }
}

fullPrompt += `\n---\n[TASK] ${task}`;

// ─── 실행 ───
const cliLabel = selectedRole.cli === 'claude' ? '🟣 Claude Code' : '🔵 Gemini CLI';
console.log(`\n🤖 [BCL-AGENT] ${selectedRole.name} 에이전트를 스폰합니다...`);
console.log(`📌 CLI: ${cliLabel} (${selectedRole.model})`);
console.log(`📌 할일: ${task}`);
console.log(`📚 참조: ${selectedRole.readFiles.join(', ')}`);
console.log('─'.repeat(60) + '\n');

let result;

if (selectedRole.cli === 'claude') {
    result = spawnSync('npx', [
        '-y', '@anthropic-ai/claude-code',
        '--model', selectedRole.model,
        '-p', fullPrompt,
        '--max-turns', '3',
    ], { stdio: 'inherit', cwd: process.cwd(), env: { ...process.env } });
} else {
    result = spawnSync('npx', [
        '-y', '@google/gemini-cli',
        '-m', selectedRole.model,
        '-p', fullPrompt,
    ], { stdio: 'inherit', cwd: process.cwd(), env: { ...process.env } });
}

if (result.error) {
    console.error('\n❌ 실행 실패:', result.error.message);
    process.exit(1);
}

process.exit(result.status || 0);
