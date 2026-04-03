/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        background: "hsl(222 47% 4%)",
        foreground: "hsl(210 40% 98%)",
        card: "hsl(222 47% 7%)",
        border: "hsl(217 33% 16%)",
      },
      boxShadow: {
        glass: "0 8px 30px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
