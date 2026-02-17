'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AdminModalProps {
    show: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    width?: string;
}

/**
 * Unified Admin Modal Component
 * - Uses createPortal for proper z-index stacking
 * - Positioned to cover only the content area (right of sidebar)
 * - Backdrop with blur effect
 * - Fixed width with scrollable content
 * - Click backdrop to dismiss
 * - Escape key to dismiss
 */
export default function AdminModal({ show, onClose, title, subtitle, children, width = '520px' }: AdminModalProps) {
    // Handle escape key
    useEffect(() => {
        if (!show) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [show]);

    if (!show) return null;

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
                    width,
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
            </div>
        </div>,
        document.body
    );
}
