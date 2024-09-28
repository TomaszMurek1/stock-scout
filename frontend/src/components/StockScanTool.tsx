import React, { useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
} from "@mui/material";

const scanOptions = ["Golden Cross", "Death Cross", "Consolidation"];
const marketOptions = ["GPW", "NASDAQ", "SP500"];

const StockScanTool: React.FC = () => {
  const [selectedScan, setSelectedScan] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");

  const handleScan = () => {
    console.log(`Scanning ${selectedMarket} for ${selectedScan}`);
    // Implement your scan logic here
  };

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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

        <Button
          variant="contained"
          onClick={handleScan}
          disabled={!selectedScan || !selectedMarket}
          size="large"
          sx={{ mt: 2 }}
        >
          Scan
        </Button>
      </Box>
    </Paper>
  );
};

export default StockScanTool;
