/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "../../apps/web/**/*.{js,jsx,ts,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2563EB', // Blue 600
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#F3F4F6', // Gray 100
                    foreground: '#1F2937', // Gray 800
                },
                destructive: {
                    DEFAULT: '#EF4444', // Red 500
                    foreground: '#FFFFFF',
                },
                background: '#FFFFFF',
                foreground: '#0F172A', // Slate 900
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
