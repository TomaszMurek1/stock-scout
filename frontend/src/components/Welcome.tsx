import React from "react";
import { Box, Typography, Button } from "@mui/material";

interface WelcomeProps {
  onGetStarted: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onGetStarted }) => {
  return (
    <Box textAlign="center" mt={8}>
      <Typography variant="h2" component="h2" gutterBottom>
        Welcome to Stock Scan Tool
      </Typography>
      <Typography variant="body1" paragraph>
        Access powerful stock analysis tools to make informed investment
        decisions.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={onGetStarted}
        sx={{ mt: 2 }}
      >
        Get Started
      </Button>
    </Box>
  );
};

export default Welcome;
