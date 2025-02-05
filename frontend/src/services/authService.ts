import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE_URL = `${API_URL}/auth`;

export const register = (username: string, email: string, password: string) => {
  return axios.post(`${API_BASE_URL}/register`, { username, email, password });
};

export const login = (email: string, password: string) => {
  return axios.post(`${API_BASE_URL}/login`, { email, password });
};
