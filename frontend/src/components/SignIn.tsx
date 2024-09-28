import React, { useState } from "react";
import { Button, TextField, Typography, Box } from "@mui/material";
import axios from "axios";

interface SignInProps {
  onClose: () => void;
  onSignIn: (token: string) => void;
}

const SignIn: React.FC<SignInProps> = ({ onClose, onSignIn }) => {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Add validation
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      if (isRegistering) {
        await axios.post("http://localhost:8000/auth/register", {
          username,
          email,
          password,
        });
        setIsRegistering(false);
      } else {
        const response = await axios.post("http://localhost:8000/auth/login", {
          email,
          password,
        });
        onSignIn(response.data.access_token);
        onClose();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: "auto", mt: 4 }}>
      <Typography variant="h4">
        {isRegistering ? "Register" : "Sign In"}
      </Typography>
      <form onSubmit={handleSubmit}>
        {isRegistering && (
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
        <TextField
          fullWidth
          margin="normal"
          label="Email"
          value={email}
          onChange={handleEmailChange}
          error={!!emailError}
          helperText={emailError}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={!email || !password} // Disable button if fields are empty
        >
          Sign In
        </Button>
      </form>
      <Button onClick={() => setIsRegistering(!isRegistering)} sx={{ mt: 2 }}>
        {isRegistering
          ? "Already have an account? Sign In"
          : "Need an account? Register"}
      </Button>
    </Box>
  );
};

export default SignIn;
