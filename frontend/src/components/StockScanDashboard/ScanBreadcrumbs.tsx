import React from "react";
import { Breadcrumbs, Link, Typography, useTheme } from "@mui/material";

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

export default ScanTypeBreadcrumbs;
