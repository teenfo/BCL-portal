'use client';

// 수동 발송(Compose) 모달 (02-admin §3.13)
// 세그먼트 선택 + 메시지 작성 UI까지만. 실제 발송 트리거는 서버 경로(pg_net/Edge Function/cron)이므로
// ⏳ 화면에서 직접 발송하지 않는다 — 규칙/이력 관리가 이 탭의 본 역할.
import { useState } from 'react';
import { Modal, Button, Input, Select, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { CHANNEL_OPTIONS } from './types';
import styles from './crm.module.css';

interface Props {
  onClose: () => void;
}

export function ComposeModal({ onClose }: Props) {
  const toast = useToast();
  const [segment, setSegment] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<string[]>(['in_app']);

  const onSubmit = () => {
    // 실발송은 서버 경로로만 — 화면은 작성까지. 발송 파이프라인 연결 전까지 안내만 노출.
    toast.info('실제 발송은 서버 발송 경로 연결 후 지원됩니다. (⏳ 규칙·이력 관리 위주)');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="수동 발송 (Compose)"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={!title.trim() || !message.trim() || channels.length === 0}>
            발송 준비
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Card variant="accent">
          <span className={styles.pending}>
            대상 세그먼트와 메시지를 작성합니다. 실제 발송 트리거(pg_net/Edge Function)는 서버 경로로만 실행됩니다.
          </span>
        </Card>

        <Select
          label="대상 세그먼트"
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'all', label: '전체 회원' },
            { value: 'active', label: '활성 멤버십' },
            { value: 'expiring', label: '만기 임박(D-7)' },
            { value: 'inactive', label: '장기 미출석' },
          ]}
        />

        <Select label="채널" multiple value={channels} onChange={setChannels} options={CHANNEL_OPTIONS} />

        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input label="메시지" multiline rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
    </Modal>
  );
}
