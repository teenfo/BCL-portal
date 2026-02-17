'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AdminModalProps {
    show?: boolean;
    isOpen?: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    width?: string;
    size?: 'sm' | 'md' | 'lg';
    footer?: React.ReactNode;
}

const SIZE_MAP = { sm: '420px', md: '520px', lg: '680px' };

/**
 * Unified Admin Modal Component
 * - Uses createPortal for proper z-index stacking
 * - Positioned to cover only the content area (right of sidebar)
 * - Backdrop with blur effect
 * - Fixed width with scrollable content
 * - Click backdrop to dismiss
 * - Escape key to dismiss
 */
export default function AdminModal({ show, isOpen, onClose, title, subtitle, children, width, size, footer }: AdminModalProps) {
    const visible = show ?? isOpen ?? false;
    const resolvedWidth = width || SIZE_MAP[size || 'md'];
    // Handle escape key
    useEffect(() => {
        if (!visible) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [visible, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (visible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [visible]);

    if (!visible) return null;

    return createPortal(
        <div
            className="fixed flex items-center justify-center"
            style={{
                zIndex: 9999,
                top: 0,
                right: 0,
                bottom: 0,
                left: 'var(--sidebar-width, 256px)',
            }}
            onClick={onClose}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            />
            {/* Modal Content */}
            <div
                className="relative p-8 rounded-2xl border border-white/10"
                style={{
                    width: resolvedWidth,
                    maxHeight: '85vh',
                    overflowY: 'auto',
                    background: '#1a1a1a',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">{title}</h2>
                {subtitle && (
                    <p className="text-[10px] uppercase tracking-widest mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {subtitle}
                    </p>
                )}
                {!subtitle && <div className="mb-6" />}
                {children}
                {footer && (
                    <div className="mt-6 pt-6 border-t border-white/[0.05]">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
