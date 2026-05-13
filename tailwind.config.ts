import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
        extend: {
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        /* ─── CTTP Civil-Engineering Color Palette ──────── */
                        cttp: {
                                primary: {
                                        DEFAULT: 'var(--color-cttp-primary)',
                                        light: 'var(--color-cttp-primary-light)',
                                        dark: 'var(--color-cttp-primary-dark)',
                                },
                                accent: {
                                        DEFAULT: 'var(--color-cttp-accent)',
                                        hover: 'var(--color-cttp-accent-hover)',
                                        light: 'var(--color-cttp-accent-light)',
                                },
                                neutral: {
                                        DEFAULT: 'var(--color-cttp-neutral)',
                                        muted: 'var(--color-cttp-muted)',
                                },
                                status: {
                                        good: 'var(--color-cttp-good)',
                                        fair: 'var(--color-cttp-fair)',
                                        poor: 'var(--color-cttp-poor)',
                                        critical: 'var(--color-cttp-critical)',
                                },
                                bg: {
                                        app: 'var(--color-cttp-bg-app)',
                                        card: 'var(--color-cttp-bg-card)',
                                        input: 'var(--color-cttp-bg-input)',
                                },
                        },
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                }
        }
  },
  plugins: [tailwindcssAnimate],
};
export default config;
