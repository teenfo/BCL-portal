'use client';

// 설정 · 권한 탭 (02-admin §3.14 roles)
// admin_roles 권한 매트릭스(그룹×액션, permissions JSONB 단일형 {group:[actions]}) 편집
//   + admin_user_roles 사용자↔역할 배정. super_admin({"*":["all"]})은 편집 잠금.
// roles 편집은 super_admin 전용(계약 §3). 쓰기 = admin RLS 직접(⏳ audit 후속).
import { useMemo, useState } from 'react';
import {
  Card,
  Button,
  Table,
  Badge,
  Select,
  Checkbox,
  Modal,
  ConfirmModal,
  useToast,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type AdminRole,
  type AdminUserRole,
  type PermissionAction,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  isSuperAdminRole,
  fmtDateTime,
} from './types';
import styles from './settings.module.css';

interface ProfileLite {
  id: string;
  name: string | null;
  email: string | null;
}

export function RolesTab() {
  const toast = useToast();
  const { isSuperAdmin } = useMyPermissions();
  const client = getSupabaseBrowserClient();

  const roles = useQuery<AdminRole[]>(
    () =>
      query<AdminRole[]>(client, 'admin_roles', (q) =>
        q.select('id,name,display_name,description,permissions,is_system_role').order('name', { ascending: true }),
      ),
    [],
  );

  const assignments = useQuery<AdminUserRole[]>(
    () =>
      query<AdminUserRole[]>(client, 'admin_user_roles', (q) =>
        q.select('id,user_id,role_id,facility_id,assigned_at').order('assigned_at', { ascending: false }),
      ),
    [],
  );

  const profiles = useQuery<ProfileLite[]>(
    () =>
      query<ProfileLite[]>(client, 'profiles', (q) =>
        q.select('id,name,email').order('name', { ascending: true }),
      ),
    [],
  );

  const roleList = useMemo(() => roles.data ?? [], [roles.data]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const selectedRole = roleList.find((r) => r.id === selectedRoleId) ?? roleList[0] ?? null;

  // 배정
  const [assignOpen, setAssignOpen] = useState(false);
  const [removing, setRemoving] = useState<AdminUserRole | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    for (const p of profiles.data ?? []) m.set(p.id, p);
    return m;
  }, [profiles.data]);
  const roleMap = useMemo(() => {
    const m = new Map<string, AdminRole>();
    for (const r of roleList) m.set(r.id, r);
    return m;
  }, [roleList]);

  const doRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    const res = await query(client, 'admin_user_roles', (q) => q.delete().eq('id', removing.id));
    setRemoveBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '배정 해제에 실패했습니다.');
      return;
    }
    toast.success('역할 배정을 해제했습니다.');
    setRemoving(null);
    assignments.refetch();
  };

  const assignColumns: TableColumn<AdminUserRole>[] = [
    {
      key: 'user',
      header: '사용자',
      render: (a) => {
        const p = profileMap.get(a.user_id);
        return (
          <div className={styles.cellStack}>
            <span>{p?.name ?? '이름 미상'}</span>
            <span className={styles.cellSub}>{p?.email ?? a.user_id}</span>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: '역할',
      render: (a) => <Badge variant="info">{roleMap.get(a.role_id)?.display_name ?? a.role_id}</Badge>,
    },
    { key: 'assigned', header: '배정일', render: (a) => <span className={styles.cellSub}>{fmtDateTime(a.assigned_at)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) =>
        isSuperAdmin ? (
          <Button variant="ghost" size="sm" onClick={() => setRemoving(a)}>
            해제
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={styles.tabPanel}>
      {!isSuperAdmin ? (
        <Card variant="accent">
          <span className={styles.note}>
            권한 매트릭스와 역할 배정 편집은 super_admin 전용입니다. 아래 내용은 읽기 전용으로 표시됩니다.
          </span>
        </Card>
      ) : null}

      {/* 권한 매트릭스 */}
      <Card
        title="역할 권한 매트릭스"
        action={
          <div className={styles.filter}>
            <Select
              label=""
              value={selectedRole?.id ?? ''}
              onChange={(v) => setSelectedRoleId(v)}
              options={roleList.map((r) => ({ value: r.id, label: r.display_name }))}
            />
          </div>
        }
      >
        {roles.loading ? (
          <p className={styles.note}>불러오는 중…</p>
        ) : !selectedRole ? (
          <p className={styles.note}>역할이 없습니다.</p>
        ) : (
          <RoleMatrix
            key={selectedRole.id}
            role={selectedRole}
            isSuperAdmin={isSuperAdmin}
            onSaved={roles.refetch}
          />
        )}
      </Card>

      {/* 사용자 배정 */}
      <Card
        title="사용자 역할 배정"
        action={
          isSuperAdmin ? (
            <Button variant="soft" size="sm" onClick={() => setAssignOpen(true)}>
              배정 추가
            </Button>
          ) : undefined
        }
      >
        <Table<AdminUserRole>
          columns={assignColumns}
          rows={assignments.data ?? []}
          rowKey={(a) => a.id}
          loading={assignments.loading}
          empty={
            assignments.error
              ? { variant: 'error', title: '배정을 불러오지 못했습니다', description: assignments.error, onRetry: assignments.refetch }
              : { title: '배정된 역할이 없습니다', description: '사용자에게 역할을 배정하세요.' }
          }
        />
      </Card>

      {assignOpen ? (
        <AssignModal
          roles={roleList}
          profiles={profiles.data ?? []}
          onClose={() => setAssignOpen(false)}
          onSaved={() => {
            setAssignOpen(false);
            assignments.refetch();
          }}
        />
      ) : null}

      <ConfirmModal
        open={removing != null}
        title="역할 배정 해제"
        variant="danger"
        confirmLabel="해제"
        loading={removeBusy}
        message="이 사용자의 역할 배정을 해제합니다."
        onConfirm={doRemove}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

// 권한 매트릭스 편집기 — role.id를 key로 리마운트되므로 useState 초기화로 동기(effect 불필요).
function RoleMatrix({
  role,
  isSuperAdmin,
  onSaved,
}: {
  role: AdminRole;
  isSuperAdmin: boolean;
  onSaved: () => void;
}) {
  const toast = useToast();
  const locked = isSuperAdminRole(role);
  const canEditMatrix = isSuperAdmin && !locked;

  const [matrix, setMatrix] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const g of PERMISSION_GROUPS) init[g.key] = new Set(role.permissions?.[g.key] ?? []);
    return init;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (group: string, action: PermissionAction) => {
    if (!canEditMatrix) return;
    setMatrix((prev) => {
      const set = new Set(prev[group] ?? []);
      if (set.has(action)) set.delete(action);
      else set.add(action);
      return { ...prev, [group]: set };
    });
  };

  const saveMatrix = async () => {
    if (!canEditMatrix) return;
    const permissions: Record<string, string[]> = {};
    for (const g of PERMISSION_GROUPS) {
      const acts = Array.from(matrix[g.key] ?? []);
      if (acts.length > 0) permissions[g.key] = acts;
    }
    setSaving(true);
    const res = await query(getSupabaseBrowserClient(), 'admin_roles', (q) =>
      q.update({ permissions }).eq('id', role.id),
    );
    setSaving(false);
    if (!res.success) {
      toast.error(res.error ?? '권한 저장에 실패했습니다.');
      return;
    }
    toast.success(`'${role.display_name}' 역할 권한을 저장했습니다.`);
    onSaved();
  };

  return (
    <>
      {locked ? (
        <p className={styles.note}>
          <strong>{role.display_name}</strong>은 전체 권한(<code>{'{"*":["all"]}'}</code>) 역할로 편집이
          잠겨 있습니다.
        </p>
      ) : (
        <p className={styles.note}>{role.description ?? ''}</p>
      )}
      <div className={styles.matrixScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.matrixHeadCell}>권한 그룹</th>
              {PERMISSION_ACTIONS.map((a) => (
                <th key={a.key} className={styles.matrixHeadCell}>
                  {a.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => (
              <tr key={g.key}>
                <td>{g.label}</td>
                {PERMISSION_ACTIONS.map((a) => (
                  <td key={a.key}>
                    <Checkbox
                      label=""
                      checked={locked ? true : (matrix[g.key]?.has(a.key) ?? false)}
                      disabled={!canEditMatrix}
                      onChange={() => toggle(g.key, a.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEditMatrix ? (
        <div className={styles.formActions}>
          <Button variant="primary" onClick={saveMatrix} loading={saving}>
            권한 저장
          </Button>
        </div>
      ) : null}
    </>
  );
}

function AssignModal({
  roles,
  profiles,
  onClose,
  onSaved,
}: {
  roles: AdminRole[];
  profiles: ProfileLite[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!userId || !roleId) {
      setError('사용자와 역할을 모두 선택하세요.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await query(getSupabaseBrowserClient(), 'admin_user_roles', (q) =>
      q.insert({ user_id: userId, role_id: roleId }),
    );
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? '배정에 실패했습니다.');
      return;
    }
    toast.success('역할을 배정했습니다.');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="역할 배정"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={!userId || !roleId}>
            배정
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? <span className={styles.errorText}>{error}</span> : null}
        <Select
          label="사용자"
          value={userId ?? ''}
          onChange={(v) => setUserId(v || null)}
          searchable
          options={profiles.map((p) => ({
            value: p.id,
            label: `${p.name ?? '이름 미상'} · ${p.email ?? p.id}`,
          }))}
        />
        <Select
          label="역할"
          value={roleId ?? ''}
          onChange={(v) => setRoleId(v || null)}
          options={roles.map((r) => ({ value: r.id, label: r.display_name }))}
        />
      </div>
    </Modal>
  );
}
