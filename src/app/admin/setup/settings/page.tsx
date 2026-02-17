'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import AdminPageHeader from '@/components/layout/AdminPageHeader';
import QuickActionManagerTab from '@/components/settings/QuickActionManagerTab';
import {
    IconCamera, IconSave, IconGlobe, IconLock, IconFolder, IconClipboard,
    IconInbox, IconEye, IconTrash, IconRefresh, IconCheckCircle, IconShield,
    IconZap, IconLightbulb, IconPlus
} from '@/components/icons/AdminIcons';

/* ────────────────────── Types ────────────────────── */

interface SettingItem { value: string; readOnly: boolean; exists: boolean }

interface SnapshotMeta {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    settingsCount: number;
}

interface SnapshotFull extends SnapshotMeta {
    settings: Record<string, string>;
}

/* ────────────────── Settings Layout ────────────────── */

interface SettingField {
    key: string;
    label: string;
    desc: string;
    type: 'text' | 'number' | 'select' | 'path' | 'range' | 'textarea';
    options?: { value: string; label: string }[];
    ph?: string;
    unit?: string;
    min?: number;
    max?: number;
}

interface SettingsGroup {
    id: string;
    title: string;
    icon: React.ReactNode;
    desc: string;
    accentColor: string;
    fields: SettingField[];
}

// Subdir fields for path preview (used in hints section)
const SUBDIR_FIELDS = [
    { key: 'UPLOAD_SUBDIR_COACHES', label: '코치 프로필', ph: 'coaches' },
    { key: 'UPLOAD_SUBDIR_BANNERS', label: '배너 이미지', ph: 'banners' },
    { key: 'UPLOAD_SUBDIR_FACILITIES', label: '시설 이미지', ph: 'facilities' },
    { key: 'UPLOAD_SUBDIR_MEMBERS', label: '회원 프로필', ph: 'members' },
    { key: 'UPLOAD_SUBDIR_GENERAL', label: '일반 이미지', ph: 'general' },
    { key: 'UPLOAD_SUBDIR_CONTENT', label: '콘텐츠/공지사항', ph: 'content' },
    { key: 'UPLOAD_SUBDIR_EVENTS', label: '이벤트 이미지', ph: 'events' },
    { key: 'UPLOAD_SUBDIR_PRODUCTS', label: '상품 이미지', ph: 'products' },
];

const GROUPS: SettingsGroup[] = [
    {
        id: 'upload',
        title: '이미지 업로드',
        icon: <IconCamera size={18} />,
        accentColor: '#FF6B00',
        desc: '업로드 파일의 저장 경로, 처리 옵션 및 카테고리별 저장 위치 설정',
        fields: [
            { key: 'UPLOAD_BASE_DIR', label: '업로드 기본 디렉토리', desc: '모든 이미지가 저장되는 기본 경로 (상대/절대 경로)', type: 'path', ph: 'public/uploads' },
            { key: 'UPLOAD_IMAGE_MAX_WIDTH', label: '최대 너비 (px)', desc: '전체 카테고리 기본 리사이즈 너비', type: 'number', ph: '300', unit: 'px' },
            { key: 'UPLOAD_IMAGE_MAX_HEIGHT', label: '최대 높이 (px)', desc: '전체 카테고리 기본 리사이즈 높이', type: 'number', ph: '300', unit: 'px' },
            { key: 'UPLOAD_IMAGE_QUALITY', label: '압축 품질 (%)', desc: '높을수록 고화질·대용량', type: 'number', ph: '85', unit: '%' },
            {
                key: 'UPLOAD_IMAGE_FORMAT', label: '출력 포맷', desc: '이미지 저장 형식', type: 'select',
                options: [{ value: 'webp', label: 'WebP (권장)' }, { value: 'jpeg', label: 'JPEG' }, { value: 'png', label: 'PNG' }]
            },
            { key: 'UPLOAD_MAX_FILE_SIZE_MB', label: '최대 업로드 용량', desc: '파일당 용량 제한 (MB)', type: 'range', min: 1, max: 50, unit: 'MB' },
            // Separator + Category subdirectory fields
            { key: '_SUBDIR_SEPARATOR', label: '카테고리별 저장 위치', desc: '각 기능별 이미지 저장 하위 폴더명 (기본 디렉토리 기준)', type: 'separator' as any },
            { key: 'UPLOAD_SUBDIR_COACHES', label: '코치 프로필', desc: '코치 프로필 이미지 하위 폴더', type: 'text', ph: 'coaches' },
            { key: 'UPLOAD_SUBDIR_BANNERS', label: '배너 이미지', desc: '메인 배너/프로모션 이미지 하위 폴더', type: 'text', ph: 'banners' },
            { key: 'UPLOAD_SUBDIR_FACILITIES', label: '시설 이미지', desc: '지점/시설 사진 하위 폴더', type: 'text', ph: 'facilities' },
            { key: 'UPLOAD_SUBDIR_MEMBERS', label: '회원 프로필', desc: '회원 프로필 이미지 하위 폴더', type: 'text', ph: 'members' },
            { key: 'UPLOAD_SUBDIR_GENERAL', label: '일반 이미지', desc: '기타 범용 이미지 하위 폴더', type: 'text', ph: 'general' },
            { key: 'UPLOAD_SUBDIR_CONTENT', label: '콘텐츠/공지사항', desc: '공지사항, 뉴스 등 콘텐츠 이미지 하위 폴더', type: 'text', ph: 'content' },
            { key: 'UPLOAD_SUBDIR_EVENTS', label: '이벤트 이미지', desc: '이벤트/대회 관련 이미지 하위 폴더', type: 'text', ph: 'events' },
            { key: 'UPLOAD_SUBDIR_PRODUCTS', label: '상품 이미지', desc: '상품/요금제 관련 이미지 하위 폴더', type: 'text', ph: 'products' },
        ],
    },
    {
        id: 'site',
        title: '사이트 기본 정보',
        icon: <IconGlobe size={18} />,
        accentColor: '#3B82F6',
        desc: '사이트 이름, 설명 등 공통 설정',
        fields: [
            { key: 'NEXT_PUBLIC_SITE_NAME', label: '사이트 이름', desc: '브라우저 타이틀에 표시', type: 'text', ph: 'BCL CrossFit Lounge' },
            { key: 'NEXT_PUBLIC_SITE_DESCRIPTION', label: '사이트 설명', desc: 'SEO 메타 태그에 활용', type: 'textarea', ph: 'BCL CrossFit Lounge Admin Portal' },
        ],
    },
    {
        id: 'snapshot',
        title: '스냅샷 관리',
        icon: <IconSave size={18} />,
        accentColor: '#8B5CF6',
        desc: '설정 스냅샷 저장 위치와 백업 관리',
        fields: [
            { key: 'SETTINGS_SNAPSHOT_DIR', label: '스냅샷 디렉토리', desc: '외부 접근 불가한 경로로 설정하세요 (public 외부 권장)', type: 'path', ph: '.settings-snapshots' },
        ],
    },
    {
        id: 'supabase',
        title: 'Supabase 연동',
        icon: <IconZap size={18} />,
        accentColor: '#10B981',
        desc: '보안상 직접 .env 에서만 수정 가능',
        fields: [
            { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase API URL', desc: 'API 엔드포인트 (읽기 전용)', type: 'text' },
            { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Anon Access Key', desc: '공개 접근 키 (읽기 전용)', type: 'text' },
        ],
    },
];

const KEY_LABELS: Record<string, string> = {};
GROUPS.forEach((g) => g.fields.forEach((f) => { KEY_LABELS[f.key] = f.label; }));

/* ────────────────── Component ────────────────── */

export default function SettingsPage() {
    const [settings, setSettings] = useState<Record<string, SettingItem>>({});
    const [edited, setEdited] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [envPath, setEnvPath] = useState('');
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState('upload');

    const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
    const [snapshotDir, setSnapshotDir] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [snapName, setSnapName] = useState('');
    const [snapDesc, setSnapDesc] = useState('');
    const [snapSaving, setSnapSaving] = useState(false);

    const [previewSnap, setPreviewSnap] = useState<SnapshotFull | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [restoring, setRestoring] = useState(false);

    // Path validation state
    type PathStatus = { exists: boolean; checking: boolean; resolvedPath: string; isDirectory?: boolean };
    const [pathStatuses, setPathStatuses] = useState<Record<string, PathStatus>>({});
    const pathCheckTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const [createPathModal, setCreatePathModal] = useState<{ key: string; label: string; fullPath: string; resolvedPath: string } | null>(null);
    const [creatingPath, setCreatingPath] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings');
            const d = await res.json();
            if (d.success) {
                setSettings(d.settings);
                setEnvPath(d.envPath);
                const init: Record<string, string> = {};
                for (const [k, v] of Object.entries(d.settings)) init[k] = (v as SettingItem).value;
                setEdited(init);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    const loadSnapshots = useCallback(async () => {
        try {
            const res = await fetch('/api/settings/snapshots');
            const d = await res.json();
            if (d.success) { setSnapshots(d.snapshots); setSnapshotDir(d.snapshotDir); }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { load(); loadSnapshots(); }, [load, loadSnapshots]);

    const changedKeys = Object.keys(settings).filter(
        (k) => !settings[k]?.readOnly && (settings[k]?.value || '') !== (edited[k] || '')
    );
    const hasChanges = changedKeys.length > 0;

    // Check if a key is path-related
    const isPathKey = useCallback((key: string) => {
        return key === 'UPLOAD_BASE_DIR' || key.startsWith('UPLOAD_SUBDIR_');
    }, []);

    // Check single path existence
    const checkPathExists = useCallback(async (fullPath: string, key: string) => {
        if (!fullPath.trim()) {
            setPathStatuses(prev => { const next = { ...prev }; delete next[key]; return next; });
            return;
        }
        setPathStatuses(prev => ({ ...prev, [key]: { exists: false, checking: true, resolvedPath: '' } }));
        try {
            const res = await fetch(`/api/settings/check-path?path=${encodeURIComponent(fullPath)}`);
            const data = await res.json();
            setPathStatuses(prev => ({
                ...prev,
                [key]: { exists: data.exists, checking: false, resolvedPath: data.resolvedPath || '', isDirectory: data.isDirectory },
            }));
        } catch {
            setPathStatuses(prev => ({
                ...prev,
                [key]: { exists: false, checking: false, resolvedPath: '' },
            }));
        }
    }, []);

    // Resolve the full path for a key (base + subdir for subdir keys, or just value for base)
    const resolveFullPath = useCallback((key: string, value: string, currentEdited: Record<string, string>) => {
        if (key === 'UPLOAD_BASE_DIR') return value;
        if (key.startsWith('UPLOAD_SUBDIR_')) {
            const baseDir = currentEdited['UPLOAD_BASE_DIR'] || 'public/uploads';
            return `${baseDir}/${value}`;
        }
        return value;
    }, []);

    // Debounced path check when a field value changes
    const triggerPathCheck = useCallback((key: string, value: string, currentEdited: Record<string, string>) => {
        if (pathCheckTimers.current[key]) clearTimeout(pathCheckTimers.current[key]);
        if (!value.trim()) {
            setPathStatuses(prev => { const next = { ...prev }; delete next[key]; return next; });
            return;
        }
        setPathStatuses(prev => ({ ...prev, [key]: { exists: false, checking: true, resolvedPath: '' } }));
        pathCheckTimers.current[key] = setTimeout(() => {
            const fullPath = resolveFullPath(key, value, currentEdited);
            checkPathExists(fullPath, key);
        }, 600);
    }, [checkPathExists, resolveFullPath]);

    // When base dir changes, re-check all subdir paths too
    const triggerAllSubdirChecks = useCallback((newEdited: Record<string, string>) => {
        for (const sf of SUBDIR_FIELDS) {
            const subdirVal = newEdited[sf.key];
            if (subdirVal?.trim()) {
                triggerPathCheck(sf.key, subdirVal, newEdited);
            }
        }
    }, [triggerPathCheck]);

    function upd(k: string, v: string) {
        const newEdited = { ...edited, [k]: v };
        setEdited(newEdited);
        setMsg(null);
        // Trigger path check for path-related keys
        if (isPathKey(k)) {
            triggerPathCheck(k, v, newEdited);
            // If base dir changed, re-check all subdir paths
            if (k === 'UPLOAD_BASE_DIR') {
                triggerAllSubdirChecks(newEdited);
            }
        }
    }

    // Initial path check after settings load
    useEffect(() => {
        if (Object.keys(edited).length === 0) return;
        // Check base dir
        const baseDir = edited['UPLOAD_BASE_DIR'];
        if (baseDir?.trim()) checkPathExists(baseDir, 'UPLOAD_BASE_DIR');
        // Check each subdir
        for (const sf of SUBDIR_FIELDS) {
            const val = edited[sf.key];
            if (val?.trim()) {
                const fullPath = `${baseDir || 'public/uploads'}/${val}`;
                checkPathExists(fullPath, sf.key);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Create directory handler
    async function handleCreatePath() {
        if (!createPathModal) return;
        setCreatingPath(true);
        try {
            const res = await fetch('/api/settings/check-path', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: createPathModal.fullPath }),
            });
            const data = await res.json();
            if (data.success) {
                setPathStatuses(prev => ({
                    ...prev,
                    [createPathModal.key]: { exists: true, checking: false, resolvedPath: data.resolvedPath || createPathModal.resolvedPath, isDirectory: true },
                }));
                setMsg({ ok: true, text: `✅ 경로가 생성되었습니다: ${createPathModal.fullPath}` });
            } else {
                setMsg({ ok: false, text: `❌ 경로 생성 실패: ${data.error}` });
            }
        } catch {
            setMsg({ ok: false, text: '❌ 경로 생성 요청 실패' });
        }
        setCreatingPath(false);
        setCreatePathModal(null);
    }
    function reset() {
        const init: Record<string, string> = {};
        for (const [k, v] of Object.entries(settings)) init[k] = v.value;
        setEdited(init); setMsg(null);
    }

    async function save() {
        setSaving(true); setMsg(null);
        try {
            const patch: Record<string, string> = {};
            for (const k of changedKeys) patch[k] = edited[k];
            const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: patch }) });
            const d = await res.json();
            if (d.success) {
                setMsg({ ok: true, text: d.requiresRestart ? '✅ 저장 완료 — NEXT_PUBLIC_ 설정은 서버 재시작 후 적용' : '✅ 저장 완료 — 즉시 적용됩니다' });
                load();
            } else setMsg({ ok: false, text: `❌ ${d.error}` });
        } catch { setMsg({ ok: false, text: '❌ 저장 실패' }); }
        setSaving(false);
    }

    async function saveSnapshot() {
        if (!snapName.trim()) return;
        setSnapSaving(true);
        try {
            const res = await fetch('/api/settings/snapshots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: snapName.trim(), description: snapDesc.trim() }) });
            const d = await res.json();
            if (d.success) { setShowSaveModal(false); setSnapName(''); setSnapDesc(''); loadSnapshots(); setMsg({ ok: true, text: '✅ 스냅샷이 저장되었습니다' }); }
        } catch { setMsg({ ok: false, text: '❌ 스냅샷 저장 실패' }); }
        setSnapSaving(false);
    }

    async function deleteSnapshot(id: string) {
        if (!confirm('이 스냅샷을 삭제하시겠습니까?')) return;
        try { await fetch(`/api/settings/snapshots?id=${id}`, { method: 'DELETE' }); loadSnapshots(); } catch { /* ignore */ }
    }

    async function openPreview(id: string) {
        setLoadingPreview(true);
        try {
            const res = await fetch(`/api/settings/snapshots/${id}`);
            const d = await res.json();
            if (d.success) {
                setPreviewSnap(d.snapshot);
                const diff = new Set<string>();
                for (const [k, v] of Object.entries(d.snapshot.settings as Record<string, string>)) {
                    if ((edited[k] || '') !== v) diff.add(k);
                }
                setSelectedKeys(diff);
            }
        } catch { /* ignore */ }
        setLoadingPreview(false);
    }

    async function restoreSelected() {
        if (!previewSnap || selectedKeys.size === 0) return;
        setRestoring(true);
        try {
            const patch: Record<string, string> = {};
            for (const k of selectedKeys) {
                if (previewSnap.settings[k] !== undefined) patch[k] = previewSnap.settings[k];
            }
            const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: patch }) });
            const d = await res.json();
            if (d.success) { setMsg({ ok: true, text: `✅ ${selectedKeys.size}개 항목이 복원되었습니다` }); setPreviewSnap(null); load(); }
        } catch { setMsg({ ok: false, text: '❌ 복원 실패' }); }
        setRestoring(false);
    }

    function toggleKey(k: string) {
        setSelectedKeys((prev) => { const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next; });
    }
    function toggleAll(allKeys: string[]) {
        setSelectedKeys((prev) => prev.size === allKeys.length ? new Set() : new Set(allKeys));
    }
    function fmtDate(iso: string) {
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    /* ── helpers ── */
    const gf = (key: string) => {
        const item = settings[key];
        return {
            val: edited[key] || '',
            ro: item?.readOnly || false,
            changed: !item?.readOnly && (edited[key] || '') !== (item?.value || ''),
        };
    };

    const activeGroup = GROUPS.find(g => g.id === activeTab) || GROUPS[0];

    /* ═══════════════════════ RENDER ═══════════════════════ */
    return (
        <div className="transition-all duration-500">
            <AdminPageHeader
                category="Setup"
                title="SETTINGS"
                subtitle="CONFIGURATION"
            />

            {/* ── Main Layout: Sidebar Tabs + Content ── */}
            <div className="flex" style={{ minHeight: 'calc(100vh - 72px)' }}>

                {/* ── Left: Tab Navigation ── */}
                <nav className="w-[240px] shrink-0 border-r border-white/[0.04] p-5 space-y-2">
                    {GROUPS.map((g) => {
                        const isActive = activeTab === g.id;
                        const groupChanges = g.fields.filter(f => {
                            const item = settings[f.key];
                            return item && !item.readOnly && (item.value || '') !== (edited[f.key] || '');
                        }).length;
                        return (
                            <button
                                key={g.id}
                                onClick={() => setActiveTab(g.id)}
                                className="w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all group"
                                style={{
                                    background: isActive ? `${g.accentColor}12` : 'transparent',
                                    border: isActive ? `1px solid ${g.accentColor}30` : '1px solid transparent',
                                }}
                            >
                                <span className="shrink-0 transition-colors" style={{ color: isActive ? g.accentColor : 'rgba(255,255,255,0.3)' }}>
                                    {g.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-[12px] font-bold block truncate transition-colors ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}>
                                        {g.title}
                                    </span>
                                </div>
                                {groupChanges > 0 && (
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                                        style={{ background: 'var(--primary)' }}>
                                        {groupChanges}
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* Quick Action Manager Tab */}
                    <button
                        onClick={() => setActiveTab('quick-actions')}
                        className="w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all group"
                        style={{
                            background: activeTab === 'quick-actions' ? 'rgba(255,107,0,0.07)' : 'transparent',
                            border: activeTab === 'quick-actions' ? '1px solid rgba(255,107,0,0.2)' : '1px solid transparent',
                        }}
                    >
                        <span className="shrink-0" style={{ color: activeTab === 'quick-actions' ? '#FF6B00' : 'rgba(255,255,255,0.3)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                            </svg>
                        </span>
                        <span className={`text-[12px] font-bold transition-colors ${activeTab === 'quick-actions' ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}>
                            Quick Actions
                        </span>
                    </button>

                    {/* ── Divider: 새 탭은 이 위에 추가 ── */}
                    <div className="h-px bg-white/[0.04] my-3" />

                    {/* Snapshot Tab (항상 맨 아래) */}
                    <button
                        onClick={() => setActiveTab('snapshots')}
                        className="w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all group"
                        style={{
                            background: activeTab === 'snapshots' ? 'rgba(139,92,246,0.07)' : 'transparent',
                            border: activeTab === 'snapshots' ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
                        }}
                    >
                        <span className="shrink-0" style={{ color: activeTab === 'snapshots' ? '#A78BFA' : 'rgba(255,255,255,0.3)' }}>
                            <IconClipboard size={18} />
                        </span>
                        <span className={`text-[12px] font-bold transition-colors ${activeTab === 'snapshots' ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}>
                            스냅샷 백업
                        </span>
                        {snapshots.length > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                                {snapshots.length}
                            </span>
                        )}
                    </button>

                    {/* Env Path Info */}
                    <div className="pt-4 mt-auto">
                        <div className="flex items-center gap-1.5 text-[9px] text-white/15 px-2 font-mono break-all leading-relaxed">
                            <IconFolder size={10} className="shrink-0" />
                            {envPath}
                        </div>
                    </div>
                </nav>

                {/* ── Right: Content Area ── */}
                <div className="flex-1 overflow-y-auto relative" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="flex-1 p-8">
                        {/* Toast */}
                        {msg && (
                            <div className="mb-6 p-4 rounded-xl text-sm font-semibold animate-premium-fade"
                                style={{ background: msg.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, color: msg.ok ? '#4ADE80' : '#F87171' }}>
                                {msg.text}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-40">
                                <div className="w-10 h-10 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin" />
                            </div>
                        ) : activeTab === 'quick-actions' ? (
                            <QuickActionManagerTab />
                        ) : activeTab === 'snapshots' ? (
                            /* ═══ Snapshot Management Tab ═══ */
                            <div className="max-w-[800px] space-y-6 animate-premium-fade">
                                {/* Snapshot Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                                            <IconClipboard size={20} />
                                            스냅샷 백업
                                        </h2>
                                        <p className="text-[11px] text-white/30 mt-1">현재 설정을 저장하고 필요시 복원할 수 있습니다</p>
                                    </div>
                                    <button onClick={() => setShowSaveModal(true)}
                                        className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                                        style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#A78BFA' }}>
                                        <IconCamera size={14} />
                                        현재 설정 저장
                                    </button>
                                </div>

                                {/* Snapshot Directory Info */}
                                {snapshotDir && (
                                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] text-white/25 font-mono">
                                        <IconFolder size={12} />
                                        {snapshotDir}
                                    </div>
                                )}

                                {/* Snapshot List */}
                                {snapshots.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center text-center opacity-40 rounded-2xl bg-white/[0.01] border border-white/[0.03]">
                                        <IconInbox size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4">저장된 스냅샷이 없습니다</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {snapshots.map((s) => (
                                            <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all group">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                                    <IconClipboard size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[13px] font-bold text-white truncate">{s.name}</span>
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/40 font-medium">{s.settingsCount} 설정</span>
                                                    </div>
                                                    {s.description && <p className="text-[10px] text-white/30 truncate">{s.description}</p>}
                                                    <p className="text-[9px] text-white/20 mt-0.5 font-mono">{fmtDate(s.createdAt)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openPreview(s.id)}
                                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1"
                                                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60A5FA' }}>
                                                        <IconEye size={12} /> 미리보기
                                                    </button>
                                                    <button onClick={() => deleteSnapshot(s.id)}
                                                        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                                                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
                                                        <IconTrash size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Security Note */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/15">
                                    <div className="flex gap-3 items-start">
                                        <IconShield size={16} className="shrink-0 mt-0.5" />
                                        <p className="text-[11px] leading-relaxed text-purple-300/50 font-medium">
                                            스냅샷은 서버 로컬에 JSON 파일로 저장됩니다. 보안을 위해 <b className="text-purple-400">public 외부 경로</b>를 사용하세요.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ═══ Settings Group Content ═══ */
                            <div className="max-w-[800px] animate-premium-fade">
                                {/* Section Header */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: `${activeGroup.accentColor}15`, border: `1px solid ${activeGroup.accentColor}25` }}>
                                            <span style={{ color: activeGroup.accentColor }}>{activeGroup.icon}</span>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-white uppercase tracking-tight text-left">{activeGroup.title}</h2>
                                            <p className="text-[11px] text-white/30 text-left">{activeGroup.desc}</p>
                                        </div>
                                        {activeGroup.id === 'supabase' && (
                                            <div className="ml-auto px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Connected</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Configuration Hints (shown FIRST, before fields) */}
                                {activeGroup.id === 'upload' && (
                                    <div className="mb-6 space-y-4">
                                        <div className="p-5 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="shrink-0" style={{ color: 'var(--primary)' }}><IconLightbulb size={14} /></span>
                                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,107,0,0.6)' }}>Tips</span>
                                            </div>
                                            <ul className="space-y-2">
                                                <li className="flex items-start gap-2 text-[11px] text-white/25">
                                                    <span className="mt-0.5 text-[8px]" style={{ color: 'var(--primary)' }}>●</span>
                                                    업로드 경로는 상대(<span className="font-mono text-white/35">public/uploads</span>) 또는 절대(<span className="font-mono text-white/35">/var/www/uploads</span>) 경로 사용
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-white/25">
                                                    <span className="mt-0.5 text-[8px]" style={{ color: 'var(--primary)' }}>●</span>
                                                    이미지 설정은 즉시 적용 — 서버 재시작 불필요
                                                </li>
                                                <li className="flex items-start gap-2 text-[11px] text-white/25">
                                                    <span className="mt-0.5 text-[8px]" style={{ color: 'var(--primary)' }}>●</span>
                                                    저장 위치 변경 시 기존 파일은 자동으로 이동되지 않습니다 — 수동 이동이 필요합니다
                                                </li>
                                            </ul>
                                        </div>

                                        {/* Live Path Preview */}
                                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                            <div className="flex items-center gap-2 mb-3">
                                                <IconEye size={12} className="text-white/30" />
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">카테고리별 저장 경로 미리보기</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {SUBDIR_FIELDS.map(f => {
                                                    const status = pathStatuses[f.key];
                                                    const dotColor = status?.checking ? '#FBBF24' : status?.exists ? '#34D399' : status ? '#F87171' : 'var(--primary)';
                                                    return (
                                                        <div key={f.key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02]">
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status?.checking ? 'animate-pulse' : ''}`} style={{ background: dotColor }} />
                                                            <span className="text-[9px] font-mono text-white/25 truncate">
                                                                {edited['UPLOAD_BASE_DIR'] || 'public/uploads'}/{edited[f.key] || f.ph}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeGroup.id === 'site' && (
                                    <div className="mb-6 p-5 rounded-xl bg-white/[0.015] border border-white/[0.03]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="shrink-0" style={{ color: '#3B82F6' }}><IconLightbulb size={14} /></span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500/60">Notes</span>
                                        </div>
                                        <ul className="space-y-2">
                                            <li className="flex items-start gap-2 text-[11px] text-white/25">
                                                <span className="mt-0.5 text-[8px] text-blue-500">●</span>
                                                <span className="text-white/40 font-semibold">NEXT_PUBLIC_</span> 접두사 변수는 클라이언트 빌드 후 적용
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                {activeGroup.id === 'supabase' && (
                                    <div className="mb-6 p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="shrink-0" style={{ color: '#10B981' }}><IconShield size={14} /></span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">Security</span>
                                        </div>
                                        <p className="text-[11px] text-emerald-300/30 leading-relaxed">
                                            Supabase 키는 보안상 <b className="text-emerald-400/50">.env.local</b> 파일에서만 직접 수정 가능합니다. UI에서는 읽기 전용으로 표시됩니다.
                                        </p>
                                    </div>
                                )}

                                {activeGroup.id === 'snapshot' && (
                                    <div className="mb-6 p-5 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="shrink-0" style={{ color: '#8B5CF6' }}><IconShield size={14} /></span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500/60">Security</span>
                                        </div>
                                        <p className="text-[11px] text-purple-300/30 leading-relaxed">
                                            보안을 위해 <b className="text-purple-400/50">public 폴더 외부</b> 경로를 사용하는 것을 권장합니다.
                                        </p>
                                    </div>
                                )}

                                {/* Fields */}
                                <div className="space-y-4">
                                    {activeGroup.fields.map((field) => {
                                        // Render separator type
                                        if ((field.type as string) === 'separator') {
                                            return (
                                                <div key={field.key} className="pt-4 pb-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <IconFolder size={14} className="text-white/20" />
                                                        <span className="text-[12px] font-bold text-white/60 tracking-wide">{field.label}</span>
                                                        <div className="flex-1 h-px bg-white/[0.06]" />
                                                    </div>
                                                    <p className="text-[10px] text-white/20 pl-[26px]">{field.desc}</p>
                                                </div>
                                            );
                                        }

                                        const { val, ro, changed } = gf(field.key);
                                        const isRestricted = ro;

                                        return (
                                            <div key={field.key}
                                                className="p-5 rounded-xl transition-all"
                                                style={{
                                                    background: changed ? 'rgba(255,107,0,0.03)' : 'rgba(255,255,255,0.015)',
                                                    border: changed ? '1px solid rgba(255,107,0,0.15)' : '1px solid rgba(255,255,255,0.04)',
                                                }}
                                            >
                                                {/* Label Row */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-[13px] font-bold text-white/90">{field.label}</label>
                                                        {isRestricted && (
                                                            <span className="inline-flex items-center gap-1 text-[9px] text-white/20 px-2 py-0.5 rounded-md bg-white/[0.03]">
                                                                <IconLock size={9} /> .env only
                                                            </span>
                                                        )}
                                                        {changed && (
                                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,0,0.1)', color: '#FF6B00' }}>
                                                                변경됨
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-[9px] font-bold tracking-wider"
                                                        style={{ color: changed ? 'rgba(255,107,0,0.5)' : 'rgba(255,255,255,0.12)' }}>
                                                        {field.key}
                                                    </span>
                                                </div>

                                                {/* Description */}
                                                <p className="text-[10px] text-white/25 mb-3">{field.desc}</p>

                                                {/* Input */}
                                                {field.type === 'range' ? (
                                                    <div className="flex items-center gap-4">
                                                        <input type="range" min={field.min || 1} max={field.max || 50} step={1}
                                                            value={val} onChange={e => upd(field.key, e.target.value)}
                                                            disabled={isRestricted}
                                                            className="flex-1 accent-orange-500 h-2" />
                                                        <div className="w-20 text-right font-mono text-sm font-black" style={{ color: 'var(--primary)' }}>
                                                            {val}<span className="text-[10px] ml-0.5 text-white/30">{field.unit}</span>
                                                        </div>
                                                    </div>
                                                ) : field.type === 'textarea' ? (
                                                    <textarea value={val} onChange={e => upd(field.key, e.target.value)}
                                                        placeholder={field.ph} disabled={isRestricted} rows={3}
                                                        className="bcl-input w-full rounded-xl !bg-white/[0.03] !border-white/[0.06] p-4 text-sm resize-none focus:!border-white/15 transition-colors"
                                                        style={{ opacity: isRestricted ? 0.4 : 1 }} />
                                                ) : field.type === 'select' ? (
                                                    <select value={val} onChange={e => upd(field.key, e.target.value)}
                                                        disabled={isRestricted}
                                                        className="bcl-input w-full rounded-xl !bg-white/[0.03] !border-white/[0.06] h-11 px-4 text-sm cursor-pointer focus:!border-white/15 transition-colors"
                                                        style={{ colorScheme: 'dark', opacity: isRestricted ? 0.4 : 1 }}>
                                                        {field.options?.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={isRestricted ? 'password' : (field.type === 'number' ? 'number' : 'text')}
                                                        value={val} onChange={e => upd(field.key, e.target.value)}
                                                        placeholder={field.ph} disabled={isRestricted}
                                                        className={`bcl-input w-full rounded-xl !bg-white/[0.03] !border-white/[0.06] h-11 px-4 text-sm ${field.type === 'path' || isRestricted ? 'font-mono' : ''} focus:!border-white/15 transition-colors`}
                                                        style={{ opacity: isRestricted ? 0.4 : 1 }}
                                                    />
                                                )}

                                                {/* Path status indicator */}
                                                {isPathKey(field.key) && pathStatuses[field.key] && (
                                                    <div className="mt-2.5 flex items-center gap-2">
                                                        {pathStatuses[field.key].checking ? (
                                                            /* Checking animation */
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02]">
                                                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                                <span className="text-[10px] text-white/30 font-medium">경로 확인 중...</span>
                                                            </div>
                                                        ) : pathStatuses[field.key].exists ? (
                                                            /* Path exists */
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                                <IconCheckCircle size={12} className="text-emerald-400" />
                                                                <span className="text-[10px] text-emerald-400/70 font-medium">경로 존재</span>
                                                                <span className="text-[9px] font-mono text-white/15 ml-1 truncate max-w-[300px]">{pathStatuses[field.key].resolvedPath}</span>
                                                            </div>
                                                        ) : (
                                                            /* Path does NOT exist */
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                                                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                                                                    </svg>
                                                                    <span className="text-[10px] text-red-400/80 font-medium">경로가 존재하지 않습니다</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const fullPath = resolveFullPath(field.key, val, edited);
                                                                        setCreatePathModal({
                                                                            key: field.key,
                                                                            label: field.label,
                                                                            fullPath,
                                                                            resolvedPath: pathStatuses[field.key].resolvedPath,
                                                                        });
                                                                    }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                                    style={{ background: 'rgba(255,107,0,0.08)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.15)' }}
                                                                >
                                                                    <IconPlus size={10} />
                                                                    폴더 생성
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Sticky Bottom Action Bar (shows only with changes) ── */}
                    {hasChanges && (
                        <div
                            className="sticky bottom-0 z-10"
                            style={{
                                background: 'linear-gradient(to top, rgba(13,13,14,0.98) 60%, rgba(13,13,14,0))',
                                padding: '24px 32px 20px',
                            }}
                        >
                            <div
                                className="flex items-center justify-between max-w-[800px] mx-auto px-6 py-4 rounded-2xl"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,107,0,0.15)',
                                    backdropFilter: 'blur(20px)',
                                    boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
                                    animation: 'slideUpFade 0.3s ease-out',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--primary)' }} />
                                    <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                                        {changedKeys.length}개 항목 변경됨
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={reset} disabled={saving}
                                        className="h-9 px-5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all hover:bg-white/[0.06]"
                                        style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                                    >Reset</button>
                                    <button onClick={save} disabled={saving}
                                        className="h-9 px-6 rounded-lg text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                                        style={{ background: 'var(--primary)', boxShadow: '0 4px 20px rgba(255,107,0,0.25)' }}
                                    >
                                        <IconSave size={13} />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Modal: Create Path Confirmation ═══ */}
            {createPathModal && createPortal(
                <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10000 }} onClick={() => !creatingPath && setCreatePathModal(null)}>
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
                    <div
                        className="relative p-7 rounded-2xl border border-white/10"
                        style={{ width: '480px', background: '#1a1a1a', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', animation: 'slideUpFade 0.25s ease-out' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,0,0.1)' }}>
                                <IconFolder size={20} className="text-[var(--primary)]" />
                            </div>
                            <div>
                                <h2 className="text-[15px] font-black text-white uppercase tracking-tight">폴더 생성 확인</h2>
                                <p className="text-[10px] text-white/30 mt-0.5">{createPathModal.label}</p>
                            </div>
                        </div>

                        {/* Path Info */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-5 space-y-3">
                            <div>
                                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">생성할 경로</span>
                                <p className="font-mono text-[12px] text-white/60 mt-1 break-all">{createPathModal.fullPath}</p>
                            </div>
                            {createPathModal.resolvedPath && (
                                <div>
                                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">절대 경로</span>
                                    <p className="font-mono text-[10px] text-white/30 mt-1 break-all">{createPathModal.resolvedPath}</p>
                                </div>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-2 mb-6 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0 mt-0.5">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span className="text-[10px] text-amber-400/60 leading-relaxed">
                                이 경로에 폴더를 생성합니다. 중간 경로가 없으면 재귀적으로 모두 생성됩니다.
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCreatePathModal(null)}
                                disabled={creatingPath}
                                className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleCreatePath}
                                disabled={creatingPath}
                                className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                style={{ background: creatingPath ? 'rgba(255,107,0,0.4)' : 'rgba(255,107,0,0.8)', boxShadow: '0 0 20px rgba(255,107,0,0.15)' }}
                            >
                                {creatingPath ? (
                                    <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> 생성 중...</>
                                ) : (
                                    <span className="inline-flex items-center gap-1"><IconPlus size={14} /> 폴더 생성</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ Modal: Save Snapshot ═══ */}
            {showSaveModal && createPortal(
                <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }} onClick={() => setShowSaveModal(false)}>
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
                    <div className="relative p-7 rounded-2xl border border-white/10" style={{ width: '440px', background: '#1a1a1a', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-6">
                            <IconCamera size={20} />
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">스냅샷 저장</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5">이름 *</label>
                                <input value={snapName} onChange={(e) => setSnapName(e.target.value)} placeholder="예: 운영 서버 초기 설정"
                                    className="bcl-input w-full rounded-lg text-sm" style={{ height: '42px' }} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-1.5">설명 (선택)</label>
                                <textarea value={snapDesc} onChange={(e) => setSnapDesc(e.target.value)} placeholder="변경 사유나 메모를 남겨주세요"
                                    className="bcl-input w-full rounded-lg text-sm resize-none" rows={2} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowSaveModal(false)} disabled={snapSaving}
                                className="flex-1 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all">취소</button>
                            <button onClick={saveSnapshot} disabled={snapSaving || !snapName.trim()}
                                className="flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                style={{ background: snapSaving ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.8)', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
                                {snapSaving ? <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> 저장 중...</> : <span className="inline-flex items-center gap-1"><IconCamera size={14} /> 저장</span>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ═══ Modal: Snapshot Preview ═══ */}
            {(previewSnap || loadingPreview) && createPortal(
                <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }} onClick={() => { if (!restoring) { setPreviewSnap(null); setLoadingPreview(false); } }}>
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} />
                    <div className="relative rounded-2xl border border-white/10 flex flex-col"
                        style={{ width: '660px', maxHeight: '85vh', background: '#141414', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
                        onClick={(e) => e.stopPropagation()}>
                        {loadingPreview ? (
                            <div className="flex items-center justify-center py-24">
                                <div className="w-8 h-8 rounded-xl border-2 border-white/5 border-t-[var(--primary)] animate-spin" />
                            </div>
                        ) : previewSnap && (() => {
                            const snapKeys = Object.keys(previewSnap.settings);
                            const allDiffKeys = snapKeys.filter((k) => (edited[k] || '') !== (previewSnap.settings[k] || ''));
                            const sameKeys = snapKeys.filter((k) => (edited[k] || '') === (previewSnap.settings[k] || ''));
                            return (
                                <>
                                    <div className="px-7 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <IconClipboard size={18} />
                                            <h2 className="text-base font-black text-white uppercase tracking-tight">스냅샷 미리보기</h2>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-white/30">
                                            <span className="font-bold text-white/70">{previewSnap.name}</span>
                                            <span>·</span><span>{fmtDate(previewSnap.createdAt)}</span>
                                            <span>·</span><span>{previewSnap.settingsCount}개 설정</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {allDiffKeys.length > 0 && (
                                            <div>
                                                <div className="px-7 py-3 flex items-center justify-between sticky top-0" style={{ background: '#141414', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                                                        <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">차이 항목 ({allDiffKeys.length})</span>
                                                    </div>
                                                    <button onClick={() => toggleAll(allDiffKeys)} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md hover:bg-white/5" style={{ color: '#A78BFA' }}>
                                                        {selectedKeys.size === allDiffKeys.length ? '전체 해제' : '전체 선택'}
                                                    </button>
                                                </div>
                                                {allDiffKeys.map((k) => (
                                                    <label key={k} className="px-7 py-3 flex items-start gap-4 cursor-pointer hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <input type="checkbox" checked={selectedKeys.has(k)} onChange={() => toggleKey(k)} className="mt-1 accent-[var(--primary)] w-4 h-4 shrink-0 rounded" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[11px] font-bold text-white/80">{KEY_LABELS[k] || k}</span>
                                                                <span className="text-[8px] font-mono text-white/20">{k}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                                                    <span className="text-[8px] font-black uppercase tracking-widest block mb-0.5" style={{ color: '#F87171' }}>현재</span>
                                                                    <span className="text-[10px] font-mono text-white/60 break-all">{edited[k] || '(비어있음)'}</span>
                                                                </div>
                                                                <div className="rounded-lg p-2" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                                                                    <span className="text-[8px] font-black uppercase tracking-widest block mb-0.5" style={{ color: '#4ADE80' }}>스냅샷</span>
                                                                    <span className="text-[10px] font-mono text-white/60 break-all">{previewSnap.settings[k] || '(비어있음)'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {sameKeys.length > 0 && (
                                            <div>
                                                <div className="px-7 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <span className="w-2 h-2 rounded-full bg-green-500/50" />
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">동일 항목 ({sameKeys.length})</span>
                                                </div>
                                                {sameKeys.map((k) => (
                                                    <div key={k} className="px-7 py-2 flex items-center gap-4 opacity-40" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <IconCheckCircle size={10} />
                                                        <span className="text-[10px] text-white/50">{KEY_LABELS[k] || k}</span>
                                                        <span className="text-[9px] font-mono text-white/20 truncate flex-1 text-right">{edited[k] || '(비어있음)'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {allDiffKeys.length === 0 && (
                                            <div className="px-7 py-12 text-center opacity-40">
                                                <IconCheckCircle size={24} />
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-3">현재 설정과 스냅샷이 동일합니다</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-7 py-4 shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span className="text-[10px] text-white/30">
                                            {selectedKeys.size > 0 ? <><strong className="text-white/70">{selectedKeys.size}개</strong> 항목 선택됨</> : '복원할 항목을 선택하세요'}
                                        </span>
                                        <div className="flex gap-3">
                                            <button onClick={() => setPreviewSnap(null)} disabled={restoring}
                                                className="px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/[0.06] transition-all">닫기</button>
                                            <button onClick={restoreSelected} disabled={restoring || selectedKeys.size === 0}
                                                className="px-5 py-2.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all flex items-center gap-2"
                                                style={{
                                                    background: selectedKeys.size > 0 ? 'rgba(59,130,246,0.7)' : 'rgba(59,130,246,0.2)',
                                                    boxShadow: selectedKeys.size > 0 ? '0 0 20px rgba(59,130,246,0.2)' : 'none',
                                                    cursor: selectedKeys.size > 0 ? 'pointer' : 'not-allowed',
                                                }}>
                                                {restoring ? <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> 복원 중...</> : <span className="inline-flex items-center gap-1"><IconRefresh size={14} /> 선택 항목 복원</span>}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
