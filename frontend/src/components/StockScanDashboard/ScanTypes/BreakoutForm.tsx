import React, { useState } from "react";
import { Box, TextField, Button, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";

const BreakoutForm: React.FC = () => {
  const [ticker, setTicker] = useState("");
  const [shortPeriod, setShortPeriod] = useState("50");
  const [longPeriod, setLongPeriod] = useState("200");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/golden-cross-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, shortPeriod, longPeriod }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Golden Cross scan completed successfully");
        // Handle the scan results here
      } else {
        toast.error(data.detail || "An error occurred");
      }
    } catch (error) {
      console.error("Error during Golden Cross scan:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return <div>BreakoutForm</div>;
};

export default BreakoutForm;
