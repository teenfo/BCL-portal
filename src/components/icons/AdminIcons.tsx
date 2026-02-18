// Admin SVG Icon Library
// Consistent stroke-based icons matching AdminSidebar icon style
// All icons: viewBox 0 0 24 24, stroke="currentColor", strokeWidth="1.8", rounded caps/joins

import React from 'react';

interface IconProps {
    size?: number;
    className?: string;
}

const defaultProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
};

// ─── People & Members ───────────────────────────────────
export const IconMembers = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);

export const IconUser = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export const IconCoach = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);

// ─── Schedule & Calendar ────────────────────────────────
export const IconCalendar = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

// ─── Notifications & Bell ───────────────────────────────
export const IconBell = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
);

export const IconMegaphone = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M3 11l18-5v12L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 01-5.8-1.6" />
    </svg>
);

// ─── Payments & Finance ─────────────────────────────────
export const IconCreditCard = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

export const IconDollar = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
);

export const IconWallet = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
        <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
);

// ─── Charts & Analytics ─────────────────────────────────
export const IconBarChart = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
);

export const IconTrendingUp = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
        <polyline points="17,6 23,6 23,12" />
    </svg>
);

export const IconLineChart = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 4-8" />
    </svg>
);

export const IconPieChart = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M21.21 15.89A10 10 0 118 2.83" />
        <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
);

// ─── Check-in & Verification ────────────────────────────
export const IconCheckSquare = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polyline points="9,11 12,14 22,4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
);

export const IconCheckCircle = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
);

// ─── QR & Devices ───────────────────────────────────────
export const IconQRCode = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="3" height="3" />
        <line x1="21" y1="14" x2="21" y2="14.01" />
        <line x1="21" y1="18" x2="21" y2="21" />
        <line x1="17" y1="21" x2="17" y2="21.01" />
    </svg>
);

export const IconSmartphone = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
);

export const IconMonitor = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

export const IconHand = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M18 11V6a2 2 0 00-4 0v5" />
        <path d="M14 10V4a2 2 0 00-4 0v6" />
        <path d="M10 10.5V6a2 2 0 00-4 0v8" />
        <path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.76 0-3.77-1-6-4l-1.25-2a2 2 0 013.46-2L6 15" />
    </svg>
);

export const IconFaceId = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M7 3H5a2 2 0 00-2 2v2" />
        <path d="M17 3h2a2 2 0 012 2v2" />
        <path d="M7 21H5a2 2 0 01-2-2v-2" />
        <path d="M17 21h2a2 2 0 002-2v-2" />
        <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
        <path d="M9.5 15a3.5 3.5 0 005 0" />
    </svg>
);

// ─── Tools & Actions ────────────────────────────────────
export const IconSettings = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

export const IconEdit = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

export const IconTrash = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polyline points="3,6 5,6 21,6" />
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

export const IconSearch = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

// ─── Documents & Notes ──────────────────────────────────
export const IconFileText = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10,9 9,9 8,9" />
    </svg>
);

export const IconClipboard = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
);

export const IconNotes = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

// ─── Security & Shield ──────────────────────────────────
export const IconShield = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

export const IconLock = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);

export const IconKey = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);

// ─── Navigation & Misc ──────────────────────────────────
export const IconTarget = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

export const IconFlag = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
);

export const IconZap = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
);

export const IconEye = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export const IconRadio = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
    </svg>
);

export const IconBuilding = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
);

export const IconDatabase = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
);

export const IconLink = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
);

// ─── Sports & Activity ──────────────────────────────────
export const IconRowing = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M2 20l4-4m4-4l4-4m4-4l4-4" />
        <circle cx="12" cy="8" r="3" />
        <path d="M6 18l2-2" />
        <path d="M16 8l2-2" />
    </svg>
);

export const IconTrophy = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
);

export const IconActivity = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
);

// ─── Summary & Lists ────────────────────────────────────
export const IconList = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

export const IconGrid = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

// ─── Clock & Time ───────────────────────────────────────
export const IconClock = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
    </svg>
);

// ─── Star ───────────────────────────────────────────────
export const IconStar = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
);

// ─── Feedback & Chat ────────────────────────────────────
export const IconChat = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
);

export const IconMessage = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-12.7 8.19 8.19 0 014.9 1.5l4.6-1.5-1.5 4.6 1.5 4.3z" />
    </svg>
);

export const IconUsers = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
);

// ─── Support / Headphones ───────────────────────────────
export const IconHeadphones = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M3 18v-6a9 9 0 0118 0v6" />
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
    </svg>
);

// ─── Wrench ─────────────────────────────────────────────
export const IconWrench = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
);

// ─── Pin / Map ──────────────────────────────────────────
export const IconMapPin = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

// ─── Circle (status) ────────────────────────────────────
export const IconCircle = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="12" cy="12" r="10" />
    </svg>
);

// ─── Plus ───────────────────────────────────────────────
export const IconPlus = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

// ─── Camera ─────────────────────────────────────────────
export const IconCamera = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

// ─── Phone ──────────────────────────────────────────────
export const IconPhone = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
);

// ─── Save / Disk ────────────────────────────────────────
export const IconSave = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
        <polyline points="17,21 17,13 7,13 7,21" />
        <polyline points="7,3 7,8 15,8" />
    </svg>
);

// ─── Globe ──────────────────────────────────────────────
export const IconGlobe = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
);

// ─── Lightbulb ──────────────────────────────────────────
export const IconLightbulb = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
    </svg>
);

// ─── Folder ─────────────────────────────────────────────
export const IconFolder = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
);

// ─── Refresh / Rotate ───────────────────────────────────
export const IconRefresh = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polyline points="23,4 23,10 17,10" />
        <polyline points="1,20 1,14 7,14" />
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
);

// ─── Send / Upload ──────────────────────────────────────
export const IconSend = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22,2 15,22 11,13 2,9" />
    </svg>
);

// ─── Palette / Art ──────────────────────────────────────
export const IconPalette = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" stroke="none" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
);

// ─── Inbox / Mail Empty ─────────────────────────────────
export const IconInbox = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <polyline points="22,12 16,12 14,15 10,15 8,12 2,12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
);

// ─── Satellite / Radio Dish ─────────────────────────────
export const IconSatellite = ({ size = 20, className }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...defaultProps}>
        <path d="M13 17l5-5" />
        <path d="M7.5 16.5L3 21" />
        <circle cx="7" cy="17" r="3" />
        <path d="M10.55 12.7a5 5 0 10-7.24-7.24" />
        <path d="M13.73 9.53a9 9 0 10-13.1-13.1" />
    </svg>
);
