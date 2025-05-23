import React, { useState } from "react";
import { Button, Typography, Box } from "@mui/material";
import { login, register } from "../../services/authService";
import { validateEmail } from "../../utils/validation";
import SignInForm from "./sign-in-form";
import RegisterForm from "./register-form";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

interface SignInProps {
  onClose: () => void;
  onSignIn: (tokenData: { access_token: string; refresh_token: string }) => void;
  onError: (error: string) => void;
}

const SignIn: React.FC<SignInProps> = ({ onClose, onSignIn, onError }) => {
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchParams] = useSearchParams();
  const invitationCodeFromUrl = searchParams.get("invitation_code") || "";

  console.log("Invitation Code from URL:", invitationCodeFromUrl);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setEmailError(
      newEmail && !validateEmail(newEmail)
        ? "Please enter a valid email address"
        : ""
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    // (Validation code here)
    try {
      if (isRegistering) {
        await register(username, email, password, invitationCodeFromUrl);
        setIsRegistering(false);
        setUsername("");
        setPassword("");
        setEmail("");
        onError("Registration successful. Please sign in.");
      } else {
        const response = await login(email, password);
        // Pass the entire token object instead of only the access token:
        onSignIn(response.data);
        onClose();
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        onError(err.response.data.detail || "Authentication failed.");
      } else {
        onError("An unexpected error occurred.");
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: "auto", mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isRegistering ? "Register2" : "Sign In"}
      </Typography>
      <form onSubmit={handleSubmit} noValidate>
        {isRegistering ? (
          <RegisterForm
            username={username}
            email={email}
            password={password}
            emailError={emailError}
            onUsernameChange={(e) => setUsername(e.target.value)}
            onEmailChange={handleEmailChange}
            onPasswordChange={(e) => setPassword(e.target.value)}
          />
        ) : (
          <SignInForm
            email={email}
            password={password}
            emailError={emailError}
            onEmailChange={handleEmailChange}
            onPasswordChange={(e) => setPassword(e.target.value)}
          />
        )}
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
          disabled={
            isRegistering
              ? !username || !email || !password || Boolean(emailError)
              : !email || !password || Boolean(emailError)
          }
        >
          {isRegistering ? "Register" : "Sign In"}
        </Button>
      </form>
      {!isRegistering ? (
        <Button onClick={() => setIsRegistering(true)} sx={{ mt: 2 }}>
          Need an account? Register
        </Button>
      ) : (
        <Button onClick={() => setIsRegistering(false)} sx={{ mt: 2 }}>
          Already have an account? Sign In
        </Button>
      )}
    </Box>
  );
};

export default SignIn;
