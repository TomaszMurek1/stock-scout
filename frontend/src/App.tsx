import React, { useState } from "react";
import "./App.css";

import SignIn from "./components/SignInForm/SignIn";
import { ThemeProvider, CssBaseline, Container, Box } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { theme } from "./theme";
//import Welcome from "./components/SignInForm/Welcome";
import Home from "./components/Home";
import { Button } from "./components/ui/button";
import { ChevronLeft } from "lucide-react";

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
        <Home />
        <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {token ? (
            <>
              <div>test</div>
              <Button className="m-4 p-2 bg-blue-500 text-white">
                <ChevronLeft className="h-6 w-6 mr-2" />
                Test Button
              </Button>
            </>
          ) : // <ScanningScenarios />
          // <StockScanTool />
          showSignIn ? (
            <SignIn
              onClose={() => setShowSignIn(false)}
              onSignIn={handleSignIn}
              onError={handleError}
            />
          ) : (
            <div>Welcome</div>
            // <Welcome onGetStarted={() => setShowSignIn(true)} />
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
