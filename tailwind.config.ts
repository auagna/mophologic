import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        lab: {
          bg: "#08090b",
          panel: "#101215",
          panel2: "#15181d",
          border: "#272b32",
          canvas: "#f2efe5",
          ink: "#050505",
          text: "#f4f1e8",
          muted: "#9aa2ad",
          blue: "#4e9dff"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"]
      },
      boxShadow: {
        panel: "0 16px 60px rgba(0, 0, 0, 0.34)"
      }
    }
  },
  plugins: []
};

export default config;
