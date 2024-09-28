import { createTheme } from "@mui/material";

// Define color constants
const LIGHT_BLUE = "#219ebc";
const GOLDEN_YELLOW = "#ffb703";
const LIGHT_GRAY = "#f5f5f5";
const DARK_BLUE = "#023047";
const ORANGE = "#fb8500";
const WHITE = "#ffffff";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: LIGHT_BLUE,
    },
    secondary: {
      main: GOLDEN_YELLOW,
    },
    background: {
      default: LIGHT_GRAY,
    },
    text: {
      primary: DARK_BLUE,
    },
    action: {
      hover: ORANGE,
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
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0px 2px 4px -1px rgba(0,0,0,0.1)",
        },
      },
    },
  },
});
