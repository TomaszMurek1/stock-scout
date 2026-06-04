import React, { Suspense } from "react";
import "./styles/App.css";

import { ThemeProvider, CssBaseline } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { theme } from "./theme";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "./services/Auth.hooks";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import Header from "./components/Header";
import PrivateRoute from "./components/private-route";
import Footer from "./components/Footer";
import LoadingScreen from "./components/shared/loading-screen";

// ── Lazy-loaded page components ──────────────────────────────────────
const Home = React.lazy(() => import("./components/Home"));
const SignIn = React.lazy(() => import("./features/sign-in-form/sign-in"));
const PortfolioManagement = React.lazy(() => import("./features/portfolio-management/PortfolioManagement"));

// Scenarios
const GoldenCrossPage = React.lazy(() => import("./features/scenario-carousel/scan-types/golden-cross/golden-cross-page"));
const DeathCrossPage = React.lazy(() => import("./features/scenario-carousel/scan-types/death-cross/death-cross-page"));
const EvToRevenuePage = React.lazy(() => import("./features/scenario-carousel/scan-types/ev-to-revenue/input-form/ev-to-revenue-page"));
const BreakEvenPointPage = React.lazy(() => import("./features/scenario-carousel/scan-types/break-even-point/break-even-point-page/break-even-point-page"));
const ChochScanPage = React.lazy(() => import("./features/scenario-carousel/scan-types/choch/choch-page"));
const ConsolidationPage = React.lazy(() => import("./features/scenario-carousel/scan-types/consolidation/consolidation-page"));
const WyckoffScanPage = React.lazy(() => import("./features/scenario-carousel/scan-types/wyckoff/wyckoff-page"));
const GmmaSqueezePage = React.lazy(() => import("./features/scenario-carousel/scan-types/gmma-squeeze/gmma-squeeze-page"));
const GmmaChartPage = React.lazy(() => import("./features/scenario-carousel/scan-types/gmma-squeeze/gmma-chart-page"));
const FibonacciElliottScanPage = React.lazy(() => import("./features/scenario-carousel/scan-types/fibonacci-elliott/fibonacci-elliott-page"));
const FiboWaveScenario = React.lazy(() => import("./features/scenario-carousel/scan-types/fibonacci-elliott/FiboWaveScenario").then(m => ({ default: m.FiboWaveScenario })));

// Stock detail & compare
const StockOnePager = React.lazy(() => import("./features/stock-one-pager/stock-one-pager").then(m => ({ default: m.StockOnePager })));
const StockCompare = React.lazy(() => import("./features/compare-stocks-page/StockCompare").then(m => ({ default: m.StockCompare })));

// Admin
const AdminDashboard = React.lazy(() => import("./features/admin/AdminDashboard"));
const AdminCreateTickersForm = React.lazy(() => import("./features/admin/admin-create-tickers/admin-create-tickers"));
const AdminFxBatchForm = React.lazy(() => import("./features/admin/admin-fx-batch/admin-fx-batch"));
const AdminSyncMarkets = React.lazy(() => import("./features/admin/admin-sync-markets/AdminSyncMarkets"));
const AdminValuationTools = React.lazy(() => import("./features/admin/admin-valuation/admin-valuation"));
const AdminYFinanceProbe = React.lazy(() => import("./features/admin/admin-yfinance-probe/AdminYFinanceProbe"));
const AdminDataRefresh = React.lazy(() => import("./features/admin/admin-data-refresh/AdminDataRefresh"));
const InvitationManager = React.lazy(() => import("./features/admin/InvitationManager"));


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
            <Suspense fallback={<LoadingScreen />}>
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
                  path="/scenarios/death-cross"
                  element={<PrivateRoute element={<DeathCrossPage />} />}
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
                <Route
                  path="/scenarios/gmma-squeeze"
                  element={<PrivateRoute element={<GmmaSqueezePage />} />}
                />
                <Route
                  path="/scenarios/gmma-squeeze/chart/:ticker"
                  element={<PrivateRoute element={<GmmaChartPage />} />}
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
                  path="/admin/data-refresh"
                  element={<PrivateRoute element={<AdminDataRefresh />} />}
                />
                <Route
                  path="/admin/invitations"
                  element={<PrivateRoute element={<InvitationManager />} />}
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
            </Suspense>
          </main>
          <Footer />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
