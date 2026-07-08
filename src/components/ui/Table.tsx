'use client';

// 표준 Table (docs/12-design-system §4.11 list-row 스켈레톤 연계, admin 밀도 row-h)
// 제네릭 컬럼 정의 · 헤더 sticky · 행 hover · 클릭형 행 접근성
// loading(Skeleton list-row) / empty(EmptyState) / 서버 페이지네이션 대응
import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import type { EmptyStateProps } from './EmptyState';
import { Button } from './Button';
import styles from './Table.module.css';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface TablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** 데이터 없음 시 표시할 EmptyState props (미지정 시 기본 문구) */
  empty?: EmptyStateProps;
  pagination?: TablePagination;
  /** loading 스켈레톤 행 수 (기본 5) */
  skeletonRows?: number;
}

function cellContent<T>(col: TableColumn<T>, row: T): ReactNode {
  if (col.render) return col.render(row);
  const v = (row as Record<string, unknown>)[col.key];
  return v == null ? '' : (v as ReactNode);
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  empty,
  pagination,
  skeletonRows = 5,
}: TableProps<T>) {
  const colCount = columns.length;
  const clickable = Boolean(onRowClick);

  const body = () => {
    if (loading) {
      return Array.from({ length: skeletonRows }).map((_, r) => (
        <tr key={`sk-${r}`} className={styles.row}>
          {columns.map((col, c) => (
            <td key={col.key} className={styles.cell} data-align={col.align ?? 'left'}>
              <Skeleton variant="text" srLabel={r === 0 && c === 0 ? '불러오는 중' : ''} />
            </td>
          ))}
        </tr>
      ));
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={colCount} className={styles.emptyCell}>
            <EmptyState
              variant={empty?.variant ?? 'empty'}
              title={empty?.title ?? '데이터가 없습니다'}
              description={empty?.description ?? '표시할 항목이 아직 없습니다.'}
              action={empty?.action}
              onRetry={empty?.onRetry}
              secondaryAction={empty?.secondaryAction}
            />
          </td>
        </tr>
      );
    }
    return rows.map((row) => (
      <tr
        key={rowKey(row)}
        className={[styles.row, clickable ? styles.clickable : null].filter(Boolean).join(' ')}
        onClick={clickable ? () => onRowClick?.(row) : undefined}
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? 'button' : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick?.(row);
                }
              }
            : undefined
        }
      >
        {columns.map((col) => (
          <td key={col.key} className={styles.cell} data-align={col.align ?? 'left'}>
            {cellContent(col, row)}
          </td>
        ))}
      </tr>
    ));
  };

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
        <table className={styles.table} aria-busy={loading || undefined}>
          <thead className={styles.thead}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={styles.th}
                  data-align={col.align ?? 'left'}
                  style={col.width ? { width: col.width } : undefined}
                  scope="col"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{body()}</tbody>
        </table>
      </div>

      {pagination && !loading && rows.length > 0 ? (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {pagination.page} / {totalPages}
          </span>
          <div className={styles.pageBtns}>
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              이전
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
