import React from "react";
import { TextField } from "@mui/material";
import { useTranslation } from "react-i18next";

interface SignInFormProps {
  email: string;
  password: string;
  emailError: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SignInForm: React.FC<SignInFormProps> = ({
  email,
  password,
  emailError,
  onEmailChange,
  onPasswordChange,
}) => {
  const { t } = useTranslation();
  
  return (
    <>
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

export default SignInForm;
