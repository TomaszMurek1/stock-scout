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
  Breadcrumbs,
  Link,
  Typography,
  Card,
  CardActionArea,
  Container,
  useTheme,
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
  { name: "Golden Cross", icon: <GiSunset size={40} /> },
  { name: "Death Cross", icon: <GiSkullCrossedBones size={40} /> },
  { name: "Breakout from Consolidation", icon: <FaRocket size={40} /> },
  { name: "Stocks in Consolidation", icon: <FaLayerGroup size={40} /> },
  { name: "MACD Bullish Crossover", icon: <GiBull size={40} /> },
  { name: "MACD Bearish Crossover", icon: <GiPolarBear size={40} /> },
  { name: "Bollinger Band Breakouts", icon: <FaChartArea size={40} /> },
  { name: "Break Even Point", icon: <FaBalanceScale size={40} /> },
  { name: "Earnings Growth Scans", icon: <FaChartLine size={40} /> },
];

const marketOptions = ["GPW", "NASDAQ", "SP500"];

const ScanTypeBreadcrumbs: React.FC<{
  selectedScan: string;
  setSelectedScan: (value: string) => void;
}> = ({ selectedScan, setSelectedScan }) => {
  const theme = useTheme();
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Link
        color="inherit"
        href="#"
        onClick={() => setSelectedScan("")}
        sx={{ fontSize: "0.875rem", color: theme.palette.primary.main }}
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
};

const ScanTypeSelector: React.FC<{
  setSelectedScan: (value: string) => void;
}> = ({ setSelectedScan }) => {
  const theme = useTheme();
  return (
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
          <Card
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "transform 0.3s, box-shadow 0.3s",
              backgroundColor: theme.palette.background.paper,
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: theme.shadows[4],
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <CardActionArea
              onClick={() => setSelectedScan(option.name)}
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
              }}
            >
              <Box color={theme.palette.primary.main}>{option.icon}</Box>
              <Typography
                variant="subtitle1"
                sx={{
                  textAlign: "center",
                  mt: 1,
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                }}
              >
                {option.name}
              </Typography>
            </CardActionArea>
          </Card>
        </Box>
      ))}
    </Box>
  );
};

const MarketSelect: React.FC<{
  selectedMarket: string;
  setSelectedMarket: (value: string) => void;
}> = ({ selectedMarket, setSelectedMarket }) => {
  const theme = useTheme();
  return (
    <FormControl fullWidth variant="outlined">
      <InputLabel>Select Market</InputLabel>
      <Select
        value={selectedMarket}
        onChange={(e) => setSelectedMarket(e.target.value)}
        label="Select Market"
        sx={{
          backgroundColor: theme.palette.background.paper,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.grey[400],
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
        }}
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
  const theme = useTheme();
  return (
    <TextField
      label="Ticker Symbol"
      value={ticker}
      onChange={(e) => setTicker(e.target.value)}
      fullWidth
      variant="outlined"
      sx={{
        backgroundColor: theme.palette.background.paper,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.grey[400],
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: theme.palette.primary.main,
        },
      }}
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

const ScanButton: React.FC<{
  isLoading: boolean;
  disabled: boolean;
}> = ({ isLoading, disabled }) => (
  <Button
    variant="outlined"
    color="primary"
    onClick={() => console.log("Scan")}
    disabled={disabled}
    size="large"
  >
    Scan
  </Button>
);

const StockScanTool: React.FC = () => {
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
          <ScanTypeSelector setSelectedScan={setSelectedScan} />
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
              <ScanButton
                isLoading={isLoading}
                disabled={!ticker || isLoading}
              />
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default StockScanTool;
