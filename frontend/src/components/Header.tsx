import React from "react";
import { AppBar, Toolbar, Button, Typography, useTheme } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";

interface HeaderProps {
  token: string | null;
  showSignIn: boolean;
  onSignOut: () => void;
  onShowSignIn: () => void;
}

const Header: React.FC<HeaderProps> = ({
  token,
  showSignIn,
  onSignOut,
  onShowSignIn,
}) => {
  const theme = useTheme();

  // Styles
  const signOutButtonStyles = {
    borderColor: theme.palette.common.white,
    opacity: 0.5,
    "&:hover": {
      borderColor: theme.palette.common.white,
      opacity: 1,
      backgroundColor: `${theme.palette.common.white}14`, // 14 is equivalent to 8% opacity
    },
  };

  const signInButtonStyles = {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.text.primary,
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <ShowChartIcon sx={{ mr: 2 }} />
        <Typography variant="h1" component="h1" sx={{ flexGrow: 1 }}>
          Stock Scan Tool
        </Typography>
        {token ? (
          <Button
            variant="outlined"
            color="inherit"
            onClick={onSignOut}
            sx={signOutButtonStyles}
          >
            Sign Out
          </Button>
        ) : (
          !showSignIn && (
            <Button
              variant="contained"
              onClick={onShowSignIn}
              sx={signInButtonStyles}
            >
              Sign In
            </Button>
          )
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
