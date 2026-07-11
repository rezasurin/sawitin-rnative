/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
          button: "var(--color-button)",
          "button-pressed": "var(--color-button-pressed)",
          inputBorder: "var(--color-input-border)",
          inputFocus: "var(--color-input-focus)",
          error: "var(--color-error)",
          success: "var(--color-success)",
          textPrimary: "var(--color-text-primary)",
          textSecondary: "var(--color-text-secondary)",
          textMuted: "var(--color-text-muted)",
          background: "var(--color-background)",
          white: "var(--color-white)",
          offline: "var(--color-offline)",
          online: "var(--color-online)",
          drawerBg: "var(--color-drawer-bg)",
          overlayBg: "var(--color-overlay-bg)",
          cardBg: "var(--color-card-bg)",
          menuItemBg: "var(--color-menu-item-bg)",
        },
      },
    },
  },
  plugins: [],
}

