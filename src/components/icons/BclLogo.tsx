'use client';

interface BclLogoProps {
    width?: number;
    height?: number;
    className?: string;
}

export default function BclLogo({ width = 32, height = 32, className }: BclLogoProps) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Refined Kettlebell Icon */}
            <path
                d="M50 10C35 10 25 20 25 35V45C15 50 10 60 10 72C10 85 20 95 50 95C80 95 90 85 90 72C90 60 85 50 75 45V35C75 20 65 10 50 10ZM35 35C35 28 40 22 50 22C60 22 65 28 65 35V42H35V35Z"
                fill="#FF6B00"
            />
        </svg>
    );
}
