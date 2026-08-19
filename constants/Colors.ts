const tintColorLight = "#6B7B3C";
const tintColorDark = "#fff";

// Brand colors from design
export const BrandColors = {
  primary: "#6B7B3C", // Olive green (header)
  primaryDark: "#5A6832", // Darker green
  button: "#C4A35A", // Golden/tan (buttons)
  buttonPressed: "#B39349", // Button pressed state
  inputBorder: "#E0E0E0", // Input borders
  inputFocus: "#6B7B3C", // Focus state
  error: "#DC3545", // Error text
  success: "#4CAF50", // Success toast
  textPrimary: "#333333",
  textSecondary: "#666666",
  textMuted: "#999999",
  background: "transparent",
  white: "#FFFFFF",
  // Home screen specific colors
  offline: "#FF0000", // Red dot for offline
  online: "#4CAF50", // Green dot for online
  drawerBg: "#FFFFFF",
  overlayBg: "rgba(0,0,0,0.5)",
  cardBg: "#fff",
  menuItemBg: "#D9D9D9",
};

export default {
  light: {
    text: BrandColors.textPrimary,
    background: BrandColors.background,
    tint: tintColorLight,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#fff",
    background: "#000",
    tint: tintColorDark,
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorDark,
  },
};
