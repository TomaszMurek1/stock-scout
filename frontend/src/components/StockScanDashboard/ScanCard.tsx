import React from "react";
import { Box, Card, CardActionArea, Typography, useTheme } from "@mui/material";
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

const ScanCard: React.FC<{
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

export default ScanCard;
