import React from "react";
import { TextField } from "@mui/material";

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
}) => (
  <>
    <TextField
      fullWidth
      margin="normal"
      label="Username"
      value={username}
      onChange={onUsernameChange}
      required
    />
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

export default RegisterForm;
