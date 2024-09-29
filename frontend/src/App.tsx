import React, { useState } from "react";
import "./App.css";
import StockScanTool from "./components/StockScanDashboard/StockScanDashboard";
import SignIn from "./components/SignInForm/SignIn";
import { ThemeProvider, CssBaseline, Container, Box } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { theme } from "./theme";
import Header from "./components/Header/Header";
import Welcome from "./components/SignInForm/Welcome";

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

  const handleError = (error: string) => {
    toast.error(error, {
      position: "bottom-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer />
      <Box className="App" sx={{ bgcolor: "background.paper" }}>
        <Header
          token={token}
          showSignIn={showSignIn}
          onSignOut={handleSignOut}
          onShowSignIn={() => setShowSignIn(true)}
        />
        <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {token ? (
            <StockScanTool />
          ) : showSignIn ? (
            <SignIn
              onClose={() => setShowSignIn(false)}
              onSignIn={handleSignIn}
              onError={handleError}
            />
          ) : (
            <Welcome onGetStarted={() => setShowSignIn(true)} />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
