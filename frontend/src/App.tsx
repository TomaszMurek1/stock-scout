import React from "react";
import "./styles/App.css";

import { ThemeProvider, CssBaseline } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { theme } from "./theme";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "./services/Auth.hooks";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import ConsolidationPage from "./features/scenario-carousel/scan-types/consolidation/consolidation-page";
import PortfolioManagement from "./features/portfolio-management/PortfolioManagement";
import SignIn from "./features/sign-in-form/sign-in";
import GoldenCrossPage from "./features/scenario-carousel/scan-types/golden-cross/golden-cross-page";
import EvToRevenuePage from "./features/scenario-carousel/scan-types/ev-to-revenue/input-form/ev-to-revenue-page";
import BreakEvenPointPage from "./features/scenario-carousel/scan-types/break-even-point/break-even-point-page/break-even-point-page";
import ChochScanPage from "./features/scenario-carousel/scan-types/choch/choch-page";
import WyckoffScanPage from "./features/scenario-carousel/scan-types/wyckoff/wyckoff-page";
import AdminDashboard from "./features/admin/AdminDashboard";
import AdminSyncMarkets from "./features/admin/admin-sync-markets/AdminSyncMarkets";
import AdminValuationTools from "./features/admin/admin-valuation/admin-valuation";
import AdminYFinanceProbe from "./features/admin/admin-yfinance-probe/AdminYFinanceProbe";
import AdminFinancialRefresh from "./features/admin/admin-financial-refresh/AdminFinancialRefresh";
import AdminPriceHistory from "./features/admin/admin-price-history/AdminPriceHistory";
import { StockOnePager } from "./features/stock-one-pager/stock-one-pager";
import { FiboWaveScenario } from "./features/scenario-carousel/scan-types/fibonacci-elliott/FiboWaveScenario";
import FibonacciElliottScanPage from "./features/scenario-carousel/scan-types/fibonacci-elliott/fibonacci-elliott-page";
import { StockCompare } from "./features/comapre-stocks-page/StockCompare";
import AdminFxBatchForm from "./features/admin/admin-fx-batch/admin-fx-batch";
import AdminCreateTickersForm from "./features/admin/admin-create-tickers/admin-create-tickers";
import Header from "./components/Header";
import PrivateRoute from "./components/private-route";
import Home from "./components/Home";
import Footer from "./components/Footer";


function App() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (tokenData: { access_token: string; refresh_token: string }) => {
    try {
      login(tokenData);
      navigate("/");
    } catch {
      handleError("Login failed");
    }
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
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <ToastContainer />
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route
                path="/signin"
                element={
                  <SignIn onClose={() => {}} onSignIn={handleSignIn} onError={handleError} />
                }
              />
              <Route path="/" element={<PrivateRoute element={<Home />} />} />
              <Route path="/portfolio-management" element={<PortfolioManagement />} />
              <Route
                path="/scenarios/golden-cross"
                element={<PrivateRoute element={<GoldenCrossPage />} />}
              />
              <Route
                path="/scenarios/ev-to-revenue"
                element={<PrivateRoute element={<EvToRevenuePage />} />}
              />
              <Route
                path="/scenarios/break-even-point"
                element={<PrivateRoute element={<BreakEvenPointPage />} />}
              />
              <Route
                path="/scenarios/choch"
                element={<PrivateRoute element={<ChochScanPage />} />}
              />
              <Route
                path="/scenarios/consolidation"
                element={<PrivateRoute element={<ConsolidationPage />} />}
              />
              <Route
                path="/scenarios/wyckoff"
                element={<PrivateRoute element={<WyckoffScanPage />} />}
              />
              <Route path="/admin" element={<PrivateRoute element={<AdminDashboard />} />} />
              <Route
                path="/admin/create-tickers"
                element={<PrivateRoute element={<AdminCreateTickersForm />} />}
              />
              <Route
                path="/admin/fx-batch"
                element={<PrivateRoute element={<AdminFxBatchForm />} />}
              />
              <Route
                path="/admin/sync-markets"
                element={<PrivateRoute element={<AdminSyncMarkets />} />}
              />
              <Route
                path="/admin/valuation"
                element={<PrivateRoute element={<AdminValuationTools />} />}
              />
              <Route
                path="/admin/yfinance-probe"
                element={<PrivateRoute element={<AdminYFinanceProbe />} />}
              />
              <Route
                path="/admin/financial-refresh"
                element={<PrivateRoute element={<AdminFinancialRefresh />} />}
              />
              <Route
                path="/admin/price-history"
                element={<PrivateRoute element={<AdminPriceHistory />} />}
              />
              <Route
                path="/stock-details/:ticker"
                element={<PrivateRoute element={<StockOnePager />} />}
              />
              <Route
                path="/scenarios/fibonacci-elliott"
                element={<PrivateRoute element={<FibonacciElliottScanPage />} />}
              />
              <Route
                path="/scenarios/fibonacci-elliott/:ticker"
                element={<PrivateRoute element={<FiboWaveScenario />} />}
              />
              <Route path="/compare/:tickerA/:tickerB" element={<StockCompare />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
