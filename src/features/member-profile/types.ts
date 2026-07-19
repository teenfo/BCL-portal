export interface MemberProfile {
  id: string;
  name: string | null;
  phone: string | null;
  birthday: string | null;
  emergency_contact: string | null;
  avatar_url: string | null;
  facility_id: string | null;
  preferences: Record<string, unknown> | null;
}

export interface FacilityInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  operating_hours: Record<string, { open?: string; close?: string }> | null;
  terms_of_service: string | null;
  refund_policy: string | null;
}

export interface ProfileSummary {
  member: MemberProfile;
  membership: {
    plan_name: string | null;
    end_date: string | null;
    remaining_credits: number | null;
  } | null;
  facility: FacilityInfo | null;
}
