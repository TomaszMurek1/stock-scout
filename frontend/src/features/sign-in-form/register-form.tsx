import React from "react";
import { TextField } from "@mui/material";
import { useTranslation } from "react-i18next";

interface RegisterFormProps {
  username: string;
  email: string;
  password: string;
  emailError: string;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  username,
  email,
  password,
  emailError,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
}) => {
  const { t } = useTranslation();
  
  return (
    <>
      <TextField
        fullWidth
        margin="normal"
        label={t("auth.username")}
        value={username}
        onChange={onUsernameChange}
        required
      />
      <TextField
        fullWidth
        margin="normal"
        label={t("auth.email")}
        value={email}
        onChange={onEmailChange}
        error={Boolean(emailError)}
        helperText={emailError}
        required
      />
      <TextField
        fullWidth
        margin="normal"
        label={t("auth.password")}
        type="password"
        value={password}
        onChange={onPasswordChange}
        required
      />
    </>
  );
};

export default RegisterForm;
