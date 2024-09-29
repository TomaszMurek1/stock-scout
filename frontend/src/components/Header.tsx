// Header.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  useTheme,
  Box,
} from "@mui/material";
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
  const buttonStyles = {
    marginLeft: theme.spacing(2),
    color: theme.palette.common.white,
    borderColor: theme.palette.common.white,
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <ShowChartIcon sx={{ mr: 2 }} />
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1 }}
          color="inherit"
        >
          Stock Scan Tool
        </Typography>
        {token ? (
          <Button variant="outlined" onClick={onSignOut} sx={buttonStyles}>
            Sign Out
          </Button>
        ) : (
          !showSignIn && (
            <Button variant="outlined" onClick={onShowSignIn} sx={buttonStyles}>
              Sign In
            </Button>
          )
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;
