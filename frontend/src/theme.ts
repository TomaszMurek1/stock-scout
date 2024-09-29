// theme.tsx
import { createTheme } from "@mui/material/styles";

// Define color constants
export const LIGHT_BLUE = "#219ebc";
export const GOLDEN_YELLOW = "#ffb703";
export const LIGHT_GRAY = "#f5f5f5"; // Light gray color
export const DARK_BLUE = "#023047";
export const ORANGE = "#fb8500";
export const WHITE = "#ffffff";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: DARK_BLUE,
    },
    secondary: {
      main: GOLDEN_YELLOW,
    },
    background: {
      default: LIGHT_GRAY, // Main background color
      paper: LIGHT_GRAY, // Paper components now use LIGHT_GRAY
    },
    text: {
      primary: DARK_BLUE,
    },
    action: {
      hover: ORANGE,
    },
    grey: {
      400: "#BDBDBD",
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontSize: "2.2rem",
      fontWeight: 500,
    },
    h2: {
      fontSize: "1.8rem",
      fontWeight: 500,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
});
