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
  Breadcrumbs,
  Link,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Container,
} from "@mui/material";
import {
  GiSunset,
  GiSkullCrossedBones,
  GiBull,
  GiPolarBear,
} from "react-icons/gi";
import {
  FaRocket,
  FaLayerGroup,
  FaChartArea,
  FaBalanceScale,
  FaChartLine,
} from "react-icons/fa";

const scanOptions = [
  { name: "Golden Cross", icon: <GiSunset /> },
  { name: "Death Cross", icon: <GiSkullCrossedBones /> },
  { name: "Breakout from Consolidation", icon: <FaRocket /> },
  { name: "Stocks in Consolidation", icon: <FaLayerGroup /> },
  { name: "MACD Bullish Crossover", icon: <GiBull /> },
  { name: "MACD Bearish Crossover", icon: <GiPolarBear /> },
  { name: "Bollinger Band Breakouts", icon: <FaChartArea /> },
  { name: "Break Even Point", icon: <FaBalanceScale /> },
  { name: "Earnings Growth Scans", icon: <FaChartLine /> },
];

const marketOptions = ["GPW", "NASDAQ", "SP500"];

const ScanTypeBreadcrumbs: React.FC<{
  selectedScan: string;
  setSelectedScan: (value: string) => void;
}> = ({ selectedScan, setSelectedScan }) => (
  <Breadcrumbs aria-label="scan type breadcrumb" sx={{ mb: 2 }}>
    <Link
      color="inherit"
      href="#"
      onClick={() => setSelectedScan("")}
      sx={{ fontSize: "0.875rem" }}
    >
      Scan Types
    </Link>
    {selectedScan && (
      <Typography color="text.primary" sx={{ fontSize: "0.875rem" }}>
        {selectedScan}
      </Typography>
    )}
  </Breadcrumbs>
);

const ScanTypeSelector: React.FC<{
  setSelectedScan: (value: string) => void;
}> = ({ setSelectedScan }) => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
    {scanOptions.map((option) => (
      <Box
        key={option.name}
        sx={{
          flexBasis: {
            xs: "100%",
            sm: "calc(50% - 8px)",
            md: "calc(33.33% - 10.67px)",
          },
        }}
      >
        <Card>
          <CardActionArea onClick={() => setSelectedScan(option.name)}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                {option.icon}
              </Typography>
              <Typography variant="subtitle1">{option.name}</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    ))}
  </Box>
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
  selectedScan: string;
}> = ({ handleFetchData, isLoading, disabled, selectedScan }) => (
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
      `Fetch ${selectedScan} Data`
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
    <Container maxWidth="sm">
      <ScanTypeBreadcrumbs
        selectedScan={selectedScan}
        setSelectedScan={setSelectedScan}
      />
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {!selectedScan ? (
            <>
              <Typography variant="h6" gutterBottom>
                Select a Scan Type:
              </Typography>
              <ScanTypeSelector setSelectedScan={setSelectedScan} />
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedScan} Scan
              </Typography>
              <MarketSelect
                selectedMarket={selectedMarket}
                setSelectedMarket={setSelectedMarket}
              />
              <TickerInput ticker={ticker} setTicker={setTicker} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <FetchDataButton
                  handleFetchData={handleFetchData}
                  isLoading={isLoading}
                  disabled={!ticker || isLoading}
                  selectedScan={selectedScan}
                />
                <ScanButton
                  isLoading={isLoading}
                  disabled={!ticker || isLoading}
                />
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default StockScanTool;
