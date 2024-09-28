import React from "react";
import { TextField } from "@mui/material";

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
}) => (
  <>
    <TextField
      fullWidth
      margin="normal"
      label="Email"
      value={email}
      onChange={onEmailChange}
      error={Boolean(emailError)}
      helperText={emailError}
      required
    />
    <TextField
      fullWidth
      margin="normal"
      label="Password"
      type="password"
      value={password}
      onChange={onPasswordChange}
      required
    />
  </>
);

export default SignInForm;
