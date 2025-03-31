import React, { useState } from "react";
import "./App.css";
import SignIn from "./components/sign-in-form/sign-in";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { theme } from "./theme";
import { Routes, Route, useNavigate } from "react-router-dom";
import PrivateRoute from "./components/private-route"; // Add this import
import GoldenCrossPage from "./components/scenario-carousel/scan-types/golden-cross/golden-cross-page";
import EvToRevenuePage from "./components/scenario-carousel/scan-types/ev-to-revenue/input-form/ev-to-revenue-page";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./components/Home";
import AdminCreateTickersPage from "./components/admin/admin-create-tickers/admin-create-tickers";
import BreakEvenPointPage from "./components/scenario-carousel/scan-types/break-even-point/break-even-point-page/break-even-point-page";
import { StockOnePager } from "./components/stock-one-pager/stock-one-pager";
import { useAuth } from "./services/useAuth";

function App() {
  const [, setAuthToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const { login } = useAuth(); 
  const navigate = useNavigate();

  const handleSignIn = async (tokenData: { access_token: string; refresh_token: string }) => {
    try {
      login(tokenData);
      navigate("/");
    } catch (error) {
      handleError("Login failed");
    }
  };

  // const handleSignOut = () => {
  //   setAuthToken(null);
  //   localStorage.removeItem("setAuthToken");
  // };

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
      <div className="flex flex-col min-h-screen">
        <ToastContainer />
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route
              path="/signin"
              element={
                <SignIn
                  onClose={() => {}}
                  onSignIn={handleSignIn}
                  onError={handleError}
                />
              }
            />
            <Route path="/" element={<PrivateRoute element={<Home />} />} />
            <Route
              path="/scenarios/golden-cross"
              element={<PrivateRoute element={<GoldenCrossPage />} />}
            />
            <Route
              path="/scenarios/ev-to-revenue"
              element={<PrivateRoute element={<EvToRevenuePage/>} />}
            />
            <Route
              path="/scenarios/break-even-point"
              element={<PrivateRoute element={<BreakEvenPointPage/>} />}
            />
            <Route
              path="/admin/create-tickers"
              element={<PrivateRoute element={<AdminCreateTickersPage />} />}
            />
             <Route
              path="/stock-details/:ticker"
              element={<PrivateRoute element={<StockOnePager />} />}
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
