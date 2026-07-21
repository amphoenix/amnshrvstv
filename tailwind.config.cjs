/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        primary: "#fff8f0",
        secondary: "#6b6b6b",
        tertiary: "#ffffff",
        "black-200": "#ece2d4",
        "white-100": "#2d2438",
        coral: "#ff6b6b",
        teal: "#4ecdc4",
        violet: "#a78bfa",
      },
      boxShadow: {
        card: "0px 20px 60px -15px rgba(26, 26, 26, 0.2)",
      },
      screens: {
        xs: "450px",
      },
      backgroundImage: {
        "hero-pattern": "url('/src/assets/aman.webp')",
      },
    },
  },
  plugins: [],
};
