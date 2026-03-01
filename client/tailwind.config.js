/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                meet: {
                    bg: '#202124',
                    surface: '#3c4043',
                    surfaceHover: '#4a4d51',
                    blue: '#8ab4f8',
                    blueHover: '#aecbfa',
                    red: '#ea4335',
                    redHover: '#f28b82',
                    gray: '#e8eaed',
                    grayMuted: '#9aa0a6',
                    black: '#000000',
                    white: '#ffffff'
                }
            },
            animation: {
                blob: "blob 7s infinite",
            },
            keyframes: {
                blob: {
                    "0%": {
                        transform: "translate(0px, 0px) scale(1)",
                    },
                    "33%": {
                        transform: "translate(30px, -50px) scale(1.1)",
                    },
                    "66%": {
                        transform: "translate(-20px, 20px) scale(0.9)",
                    },
                    "100%": {
                        transform: "translate(0px, 0px) scale(1)",
                    },
                },
            },
        },
    },
    plugins: [],
}
