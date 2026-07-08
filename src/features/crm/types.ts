// /admin/crm 공용 타입 (02-admin §3.13) — 실 컬럼은 06_notification.sql / 08_rbac_supplementary.sql

// content 탭
export interface Notice {
  id: string;
  facility_id: string | null;
  title: string;
  content: string;
  category: 'general' | 'schedule' | 'event' | 'maintenance' | 'emergency';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  position: 'home_top' | 'home_mid' | 'home_bottom' | 'popup' | 'event';
  priority_order: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

// notifications 탭
export interface NotificationRule {
  id: string;
  facility_id: string | null;
  name: string;
  description: string | null;
  trigger_type: 'class_reminder' | 'membership_expiry' | 'waitlist_vacancy' | 'absence' | 'birthday' | 'manual';
  trigger_config: Record<string, unknown>;
  title_template: string;
  message_template: string;
  category: string;
  channels: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  rule_id: string | null;
  notification_id: string | null;
  user_id: string | null;
  channel: string;
  status: 'pending' | 'sent' | 'failed' | 'read';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

// support 탭
export interface SupportTicket {
  id: string;
  member_id: string;
  subject: string;
  content: string;
  category: 'inquiry' | 'complaint' | 'suggestion' | 'refund';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  members: { name: string } | null;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export const CHANNEL_OPTIONS = [
  { value: 'in_app', label: '인앱' },
  { value: 'push', label: '웹 푸시' },
  { value: 'kakao', label: '카카오' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: '이메일' },
];

export const TRIGGER_TYPE_LABEL: Record<NotificationRule['trigger_type'], string> = {
  class_reminder: '수업 리마인더',
  membership_expiry: '멤버십 만기',
  waitlist_vacancy: '대기열 빈자리',
  absence: '장기 미출석',
  birthday: '생일',
  manual: '수동',
};

export const NOTICE_CATEGORY_LABEL: Record<Notice['category'], string> = {
  general: '일반',
  schedule: '일정',
  event: '이벤트',
  maintenance: '점검',
  emergency: '긴급',
};

export const TICKET_STATUS_LABEL: Record<SupportTicket['status'], string> = {
  open: '접수',
  in_progress: '처리 중',
  resolved: '완료',
  closed: '종료',
};

export const TICKET_CATEGORY_LABEL: Record<SupportTicket['category'], string> = {
  inquiry: '문의',
  complaint: '불만',
  suggestion: '제안',
  refund: '환불',
};
