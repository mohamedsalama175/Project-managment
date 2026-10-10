/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        clay: {
          bg: {
            light: "#eef2f5",
            dark: "#11161b",
          },
          surface: {
            light: "#f8fafc",
            dark: "#1a2129",
          },
          card: {
            light: "#f1f5f9",
            dark: "#161d24",
          },
          accent: {
            DEFAULT: "#1f8a70",
            hover: "#18705b",
            light: "#2ec49c",
            dark: "#3dd598",
          },
          coral: {
            light: "#ef4444",
            dark: "#ff6b6b",
          },
          amber: {
            light: "#f59e0b",
            dark: "#fbbf24",
          },
        },
      },
      boxShadow: {
        // Claymorphic Elevation Outer + Inner Shadows
        "clay-card-light": "8px 8px 18px rgba(160, 175, 195, 0.4), -6px -6px 14px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255, 255, 255, 0.8), inset -2px -2px 4px rgba(160, 175, 195, 0.25)",
        "clay-card-dark": "9px 9px 20px rgba(5, 8, 11, 0.8), -6px -6px 16px rgba(34, 43, 54, 0.5), inset 2px 2px 4px rgba(255, 255, 255, 0.08), inset -2px -2px 4px rgba(0, 0, 0, 0.6)",
        
        "clay-btn-light": "5px 5px 12px rgba(160, 175, 195, 0.45), -4px -4px 10px rgba(255, 255, 255, 0.95), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.9), inset -1.5px -1.5px 3px rgba(160, 175, 195, 0.3)",
        "clay-btn-dark": "6px 6px 14px rgba(5, 8, 11, 0.7), -4px -4px 12px rgba(34, 43, 54, 0.45), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.1), inset -1.5px -1.5px 3px rgba(0, 0, 0, 0.7)",

        "clay-pressed-light": "inset 4px 4px 8px rgba(160, 175, 195, 0.4), inset -4px -4px 8px rgba(255, 255, 255, 0.9)",
        "clay-pressed-dark": "inset 4px 4px 10px rgba(0, 0, 0, 0.8), inset -3px -3px 8px rgba(255, 255, 255, 0.05)",

        "clay-input-light": "inset 3px 3px 6px rgba(160, 175, 195, 0.35), inset -3px -3px 6px rgba(255, 255, 255, 0.8)",
        "clay-input-dark": "inset 3px 3px 8px rgba(0, 0, 0, 0.7), inset -2px -2px 6px rgba(34, 43, 54, 0.3)",

        "clay-pill-light": "4px 4px 10px rgba(160, 175, 195, 0.35), -3px -3px 8px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.7)",
        "clay-pill-dark": "4px 4px 10px rgba(5, 8, 11, 0.6), -3px -3px 8px rgba(34, 43, 54, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.08)",

        "clay-accent-light": "6px 6px 14px rgba(31, 138, 112, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.8), inset 2px 2px 4px rgba(255, 255, 255, 0.4), inset -2px -2px 4px rgba(20, 90, 75, 0.3)",
        "clay-accent-dark": "6px 6px 14px rgba(5, 8, 11, 0.7), -3px -3px 10px rgba(61, 213, 152, 0.2), inset 2px 2px 4px rgba(255, 255, 255, 0.2), inset -2px -2px 4px rgba(15, 60, 45, 0.5)",
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
