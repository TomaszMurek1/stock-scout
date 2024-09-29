// StockScanTool.tsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Typography,
  Container,
  useTheme,
} from "@mui/material";
import ScanCard from "./ScanCard";
import ScanTypeBreadcrumbs from "./ScanBreadcrumbs";

const marketOptions = ["GPW", "NASDAQ", "SP500"];

const MarketSelect: React.FC<{
  selectedMarket: string;
  setSelectedMarket: (value: string) => void;
}> = ({ selectedMarket, setSelectedMarket }) => {
  return (
    <FormControl fullWidth variant="outlined">
      <InputLabel>Select Market</InputLabel>
      <Select
        value={selectedMarket}
        onChange={(e) => setSelectedMarket(e.target.value)}
        label="Select Market"
      >
        {marketOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

const TickerInput: React.FC<{
  ticker: string;
  setTicker: (value: string) => void;
}> = ({ ticker, setTicker }) => {
  return (
    <TextField
      label="Ticker Symbol"
      value={ticker}
      onChange={(e) => setTicker(e.target.value)}
      fullWidth
      variant="outlined"
    />
  );
};

const FetchDataButton: React.FC<{
  handleFetchData: () => void;
  isLoading: boolean;
  disabled: boolean;
  selectedScan: string;
}> = ({ handleFetchData, isLoading, disabled, selectedScan }) => (
  <Button
    variant="contained"
    color="primary"
    onClick={handleFetchData}
    disabled={disabled}
    size="large"
  >
    {isLoading ? (
      <CircularProgress size={24} color="inherit" />
    ) : (
      `Fetch ${selectedScan} Data`
    )}
  </Button>
);

const StockScanDashboard: React.FC = () => {
  const [selectedScan, setSelectedScan] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [ticker, setTicker] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();

  const handleFetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/fetch-stock-data/${ticker}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || `Error: ${response.status}`);
      } else {
        toast.success(data.message);
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <ScanTypeBreadcrumbs
        selectedScan={selectedScan}
        setSelectedScan={setSelectedScan}
      />
      {!selectedScan ? (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
            Select a Scan Type:
          </Typography>
          <ScanCard setSelectedScan={setSelectedScan} />
        </Box>
      ) : (
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            boxShadow: theme.shadows[3],
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{ color: theme.palette.primary.main, fontWeight: 600 }}
          >
            {selectedScan} Scan
          </Typography>
          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            <MarketSelect
              selectedMarket={selectedMarket}
              setSelectedMarket={setSelectedMarket}
            />
            <TickerInput ticker={ticker} setTicker={setTicker} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                gap: 2,
                flexWrap: "wrap",
                mt: 2,
              }}
            >
              <FetchDataButton
                handleFetchData={handleFetchData}
                isLoading={isLoading}
                disabled={!ticker || isLoading}
                selectedScan={selectedScan}
              />
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default StockScanDashboard;
