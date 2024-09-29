import React, { useState } from "react";
import { Box, TextField, Button, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";

const GoldenCrossForm: React.FC = () => {
  const [ticker, setTicker] = useState("");
  const [shortPeriod, setShortPeriod] = useState("50");
  const [longPeriod, setLongPeriod] = useState("200");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/technical-analysis/golden-cross",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            short_window: shortPeriod, // Replace with your variable names
            long_window: longPeriod,
            min_volume: 1000000, // Optional, can be omitted if using default
            adjusted: true, // Optional, can be omitted if using default
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log("Golden Cross Data:", result.data);
      } else {
        console.error("Error:", result.detail);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      <TextField
        fullWidth
        label="Ticker Symbol"
        value={ticker}
        onChange={(e) => setTicker(e.target.value)}
        margin="normal"
        required
      />
      <TextField
        fullWidth
        label="Short Period (days)"
        type="number"
        value={shortPeriod}
        onChange={(e) => setShortPeriod(e.target.value)}
        margin="normal"
        required
      />
      <TextField
        fullWidth
        label="Long Period (days)"
        type="number"
        value={longPeriod}
        onChange={(e) => setLongPeriod(e.target.value)}
        margin="normal"
        required
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading}
        sx={{ mt: 2 }}
      >
        {isLoading ? <CircularProgress size={24} /> : "Run Golden Cross Scan"}
      </Button>
    </Box>
  );
};

export default GoldenCrossForm;
