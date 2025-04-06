import { apiClient } from "./apiClient";

export const register = (username: string, email: string, password: string, invitation_code: string) => {
  return apiClient.post("/auth/register", { username, email, password, invitation_code });
};

export const login = (email: string, password: string) => {
  return apiClient.post("/auth/login", { email, password });
};

export const refreshTokenRequest = (refreshToken: string) => {
  return apiClient.post("/auth/refresh", { refresh_token: `${refreshToken}` });
}; 