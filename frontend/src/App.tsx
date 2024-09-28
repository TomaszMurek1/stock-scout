import React from "react";
import "./App.css";
import StockScanTool from "./components/StockScanTool";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#121212",
    },
    primary: {
      main: "#90caf9",
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <header className="App-header">
          <h1>Stock Scan Tool</h1>
          <StockScanTool />
        </header>
      </div>
    </ThemeProvider>
  );
}

export default App;
