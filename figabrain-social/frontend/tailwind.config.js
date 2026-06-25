/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brain: {
          950: "#05060a",
          900: "#0a0d16",
          800: "#111521",
          700: "#1b2032",
          accent: "#7c5cff",
          accent2: "#22d3ee",
          point: "#ffd166",
        },
      },
      backgroundImage: {
        "brain-glow": "radial-gradient(circle at top, rgba(124,92,255,0.25), transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 24px rgba(124,92,255,0.45)",
      },
    },
  },
  plugins: [],
};
