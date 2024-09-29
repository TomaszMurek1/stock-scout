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
import GoldenCrossForm from "./ScanTypes/GoldenCrossForm";
import DeathCrossForm from "./ScanTypes/DeathCrossForm";
import BreakoutForm from "./ScanTypes/BreakoutForm";

const marketOptions = ["GPW", "NASDAQ", "SP500"];

const StockScanDashboard: React.FC = () => {
  const [selectedScan, setSelectedScan] = useState("");

  const theme = useTheme();

  const renderScanForm = () => {
    switch (selectedScan) {
      case "Golden Cross":
        return <GoldenCrossForm />;
      case "Death Cross":
        return <DeathCrossForm />;
      case "Breakout from Consolidation":
        return <BreakoutForm />;
      // ... add cases for other scan types ...
      default:
        return null;
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
          {renderScanForm()}
        </Paper>
      )}
    </Container>
  );
};

export default StockScanDashboard;
