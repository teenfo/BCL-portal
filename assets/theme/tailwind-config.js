// Tailwind CDN config for BCL Portal Color System v2
// Usage (in HTML):
// <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
// <script src="/assets/theme/tailwind-config.js"></script>
// <link rel="stylesheet" href="/assets/theme/colors.css" />
//
// NOTE: This file sets tailwind.config global.

tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                bg: "rgb(var(--bg) / <alpha-value>)",
                surface: "rgb(var(--surface) / <alpha-value>)",
                surface2: "rgb(var(--surface-2) / <alpha-value>)",
                border: "rgb(var(--border) / <alpha-value>)",

                fg: "rgb(var(--fg) / <alpha-value>)",
                muted: "rgb(var(--muted) / <alpha-value>)",
                subtle: "rgb(var(--subtle) / <alpha-value>)",

                primary: "rgb(var(--primary) / <alpha-value>)",
                onPrimary: "rgb(var(--on-primary) / <alpha-value>)",
                primarySoft: "rgb(var(--primary-soft) / <alpha-value>)",
                primaryHover: "rgb(var(--primary-hover) / <alpha-value>)",

                success: "rgb(var(--success) / <alpha-value>)",
                successSoft: "rgb(var(--success-soft) / <alpha-value>)",
                info: "rgb(var(--info) / <alpha-value>)",
                infoSoft: "rgb(var(--info-soft) / <alpha-value>)",
                warning: "rgb(var(--warning) / <alpha-value>)",
                warningSoft: "rgb(var(--warning-soft) / <alpha-value>)",
                danger: "rgb(var(--danger) / <alpha-value>)",
                dangerSoft: "rgb(var(--danger-soft) / <alpha-value>)",
                secondary: "rgb(var(--secondary) / <alpha-value>)",
                secondarySoft: "rgb(var(--secondary-soft) / <alpha-value>)",
            },
            boxShadow: {
                // light에서도 자연스럽고, dark에서도 떠 보이게
                card: "0 14px 40px -28px rgba(0,0,0,0.55)",
            },
            borderRadius: {
                xl: "16px",
                "2xl": "20px",
                pill: "9999px",
            },
            fontFamily: {
                display: ["Lexend", "sans-serif"],
            },
        },
    },
};
