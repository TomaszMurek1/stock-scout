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
} from "@mui/material";

const scanOptions = ["Golden Cross", "Death Cross", "Consolidation"];
const marketOptions = ["GPW", "NASDAQ", "SP500"];

const ScanTypeSelect: React.FC<{
  selectedScan: string;
  setSelectedScan: (value: string) => void;
}> = ({ selectedScan, setSelectedScan }) => (
  <FormControl fullWidth>
    <InputLabel id="scan-type-label">Select Scan Type</InputLabel>
    <Select
      labelId="scan-type-label"
      value={selectedScan}
      onChange={(e) => setSelectedScan(e.target.value)}
      label="Select Scan Type"
      sx={{ minWidth: 200 }}
    >
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {scanOptions.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

const MarketSelect: React.FC<{
  selectedMarket: string;
  setSelectedMarket: (value: string) => void;
}> = ({ selectedMarket, setSelectedMarket }) => (
  <FormControl fullWidth>
    <InputLabel id="market-label">Select Market</InputLabel>
    <Select
      labelId="market-label"
      value={selectedMarket}
      onChange={(e) => setSelectedMarket(e.target.value)}
      label="Select Market"
      sx={{ minWidth: 200 }}
    >
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {marketOptions.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

const TickerInput: React.FC<{
  ticker: string;
  setTicker: (value: string) => void;
}> = ({ ticker, setTicker }) => (
  <TextField
    label="Ticker Symbol"
    value={ticker}
    onChange={(e) => setTicker(e.target.value)}
    fullWidth
  />
);

const FetchDataButton: React.FC<{
  handleFetchData: () => void;
  isLoading: boolean;
  disabled: boolean;
}> = ({ handleFetchData, isLoading, disabled }) => (
  <Button
    variant="contained"
    onClick={handleFetchData}
    disabled={disabled}
    size="large"
    sx={{ mt: 2 }}
  >
    {isLoading ? (
      <CircularProgress size={24} color="inherit" />
    ) : (
      "Fetch Stock Data"
    )}
  </Button>
);

const ScanButton: React.FC<{
  isLoading: boolean;
  disabled: boolean;
}> = ({ isLoading, disabled }) => (
  <Button
    variant="contained"
    onClick={() => console.log("Scan")}
    disabled={disabled}
    size="large"
    sx={{ mt: 2 }}
  >
    Scan
  </Button>
);

const StockScanTool: React.FC = () => {
  const [selectedScan, setSelectedScan] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [ticker, setTicker] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <ScanTypeSelect
          selectedScan={selectedScan}
          setSelectedScan={setSelectedScan}
        />
        <MarketSelect
          selectedMarket={selectedMarket}
          setSelectedMarket={setSelectedMarket}
        />
        <TickerInput ticker={ticker} setTicker={setTicker} />
        <FetchDataButton
          handleFetchData={handleFetchData}
          isLoading={isLoading}
          disabled={!ticker || isLoading}
        />
        <ScanButton
          isLoading={isLoading}
          disabled={!selectedScan || !selectedMarket || isLoading}
        />
      </Box>
    </Paper>
  );
};

export default StockScanTool;
