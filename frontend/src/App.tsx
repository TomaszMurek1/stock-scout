import React, { useState } from "react";
import "./App.css";
import StockScanTool from "./components/StockScanTool";
import SignIn from "./components/SignIn";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Button,
  Typography,
  Container,
  Box,
} from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#219ebc",
    },
    secondary: {
      main: "#ffb703",
    },
    background: {
      default: "#f5f5f5",
    },
    text: {
      primary: "#023047",
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

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [showSignIn, setShowSignIn] = useState(false);

  const handleSignIn = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  };

  const handleSignOut = () => {
    setToken(null);
    localStorage.removeItem("token");
  };
  console.log(token);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="App">
        <AppBar position="static" color="primary">
          <Toolbar>
            <ShowChartIcon sx={{ mr: 2 }} />
            <Typography variant="h1" component="h1" sx={{ flexGrow: 1 }}>
              Stock Scan Tool
            </Typography>
            {token ? (
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleSignOut}
                sx={{
                  borderColor: "rgba(255, 255, 255, 0.5)",
                  "&:hover": {
                    borderColor: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  },
                }}
              >
                Sign Out
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => setShowSignIn(true)}
                sx={{
                  backgroundColor: "#ffb703",
                  color: "#023047",
                  "&:hover": {
                    backgroundColor: "#fb8500",
                  },
                }}
              >
                Sign In
              </Button>
            )}
          </Toolbar>
        </AppBar>
        <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {token ? (
            <StockScanTool />
          ) : showSignIn ? (
            <SignIn
              onClose={() => setShowSignIn(false)}
              onSignIn={handleSignIn}
            />
          ) : (
            <Box textAlign="center" mt={8}>
              <Typography variant="h2" component="h2" gutterBottom>
                Welcome to Stock Scan Tool
              </Typography>
              <Typography variant="body1" paragraph>
                Access powerful stock analysis tools to make informed investment
                decisions.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => setShowSignIn(true)}
                sx={{ mt: 2 }}
              >
                Get Started
              </Button>
            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
