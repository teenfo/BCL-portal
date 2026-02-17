'use client';

import React from 'react';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger';
    isLoading?: boolean;
    children: React.ReactNode;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
    variant = 'primary',
    isLoading,
    children,
    className = '',
    ...props
}) => {
    const variantClasses = {
        primary: 'bcl-button-primary',
        ghost: 'bcl-button-ghost',
        danger: 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20'
    };

    return (
        <button
            className={`${variantClasses[variant]} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                </div>
            ) : children}
        </button>
    );
};
