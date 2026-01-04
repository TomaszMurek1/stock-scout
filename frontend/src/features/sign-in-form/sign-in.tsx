import React, { useState } from "react";
import { Button, Typography, Box } from "@mui/material";
import { login, register } from "../../services/authService";
import { validateEmail } from "../../utils/validation";
import SignInForm from "./sign-in-form";
import RegisterForm from "./register-form";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface SignInProps {
  onClose: () => void;
  onSignIn: (tokenData: { access_token: string; refresh_token: string }) => void;
  onError: (error: string) => void;
}

const SignIn: React.FC<SignInProps> = ({ onClose, onSignIn, onError }) => {
  const [searchParams] = useSearchParams();
  const invitationCodeFromUrl = searchParams.get("invitation_code") || "";
  
  const [email, setEmail] = useState<string>("");
  const [emailError, setEmailError] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(!!invitationCodeFromUrl); // Auto-switch to register if invitation code present
  const [error, setError] = useState<string>("");
  const { t } = useTranslation();

  console.log("Invitation Code from URL:", invitationCodeFromUrl);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setEmailError(
      newEmail && !validateEmail(newEmail)
        ? t("auth.valid_email")
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
        onError(t("auth.registration_successful"));
      } else {
        const response = await login(email, password);
        // Pass the entire token object instead of only the access token:
        onSignIn(response.data);
        onClose();
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        onError(err.response.data.detail || t("auth.auth_failed"));
      } else {
        onError(t("auth.unexpected_error"));
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: "auto", mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isRegistering ? t("auth.register2") : t("auth.sign_in")}
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
          {isRegistering ? t("auth.register") : t("auth.sign_in")}
        </Button>
      </form>
      {!isRegistering ? (
        <Button onClick={() => setIsRegistering(true)} sx={{ mt: 2 }}>
          {t("auth.need_account")}
        </Button>
      ) : (
        <Button onClick={() => setIsRegistering(false)} sx={{ mt: 2 }}>
          {t("auth.have_account")}
        </Button>
      )}
    </Box>
  );
};

export default SignIn;
