import React, { useState } from "react";
import "./App.css";

import SignIn from "./components/SignInForm/SignIn";
import { ThemeProvider, CssBaseline, Container, Box } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { theme } from "./theme";

import { Routes, Route } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute"; // Add this import
import ScenarioCarousel from "./components/ScenarioCarousel/ScenarioCarousel";
import GoldenCrossForm from "./components/ScenarioCarousel/ScanTypes/GoldenCrossForm";
import { useNavigate } from "react-router-dom";

function App() {
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const navigate = useNavigate();

  const handleSignIn = (newToken: string) => {
    setAuthToken(newToken);
    localStorage.setItem("authToken", newToken);
    debugger;
    navigate("/");
  };

  const handleSignOut = () => {
    setAuthToken(null);
    localStorage.removeItem("setAuthToken");
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
        <Routes>
          <Route
            path="/signin"
            element={
              <SignIn
                onClose={() => {}}
                onSignIn={handleSignIn}
                onError={(error: string) => handleError(error)}
              />
            }
          />
          <Route
            path="/"
            element={<PrivateRoute element={<ScenarioCarousel />} />}
          />
          <Route
            path="/scenarios/golden-cross"
            element={<PrivateRoute element={<GoldenCrossForm />} />}
          />
        </Routes>
      </Box>
    </ThemeProvider>
  );
}

export default App;
