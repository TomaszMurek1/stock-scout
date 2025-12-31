// Theme colors for easy manipulation and dark/light mode switching
export const bannerColors = {
    light: {
        // Main background
        background: "bg-neutral-300",
        backgroundGradient: "from-gray-200 to-gray-300",

        // Accent gradients
        accentOverlay: "from-neutral-200/30 to-slate-200/20",
        decorativeGradient: "from-neutral-300/20 to-transparent",

        // Text colors
        primaryText: "text-slate-800",
        secondaryText: "text-slate-600",
        accentText: "text-slate-700",
        mutedText: "text-slate-500",

        // Icon and logo
        logoGradient: "from-slate-600 to-neutral-700",
        liveIndicator: "bg-emerald-500",
        liveIndicatorText: "text-emerald-600",

        // Chart colors
        chartGreen: "#059669",
        chartRed: "#dc2626",
        chartOpacity: "0.8",
    },
    dark: {
        // Main background
        background: "bg-slate-900",
        backgroundGradient: "from-slate-900 to-slate-800",

        // Accent gradients
        accentOverlay: "from-emerald-500/5 to-blue-500/5",
        decorativeGradient: "from-emerald-500/5 to-transparent",

        // Text colors
        primaryText: "text-white",
        secondaryText: "text-gray-300",
        accentText: "text-white",
        mutedText: "text-gray-400",

        // Icon and logo
        logoGradient: "from-emerald-500 to-blue-500",
        liveIndicator: "bg-emerald-400",
        liveIndicatorText: "text-emerald-400",

        // Chart colors
        chartGreen: "#10b981",
        chartRed: "#ef4444",
        chartOpacity: "0.9",
    },
}

// Current theme - easily switch between 'light' and 'dark'
export const currentTheme = "light" as keyof typeof bannerColors
export const colors = bannerColors[currentTheme]
