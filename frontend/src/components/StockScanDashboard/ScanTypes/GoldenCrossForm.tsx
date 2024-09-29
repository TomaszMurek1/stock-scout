import React, { useState } from "react";
import { Box, TextField, Button, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";

const GoldenCrossForm: React.FC = () => {
  const [shortPeriod, setShortPeriod] = useState("50");
  const [longPeriod, setLongPeriod] = useState("200");
  const [daysToLookBack, setDaysToLookBack] = useState("365"); // New state for days to look back
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
            short_window: parseInt(shortPeriod),
            long_window: parseInt(longPeriod),
            days_to_look_back: parseInt(daysToLookBack), // New parameter
            min_volume: 1000000,
            adjusted: true,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        console.log("Golden Cross Data:", result.data);
        toast.success("Golden Cross scan completed successfully");
      } else {
        console.error("Error:", result.detail);
        toast.error(result.detail || "An error occurred during the scan");
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
      <TextField
        fullWidth
        label="Days to Look Back"
        type="number"
        value={daysToLookBack}
        onChange={(e) => setDaysToLookBack(e.target.value)}
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
