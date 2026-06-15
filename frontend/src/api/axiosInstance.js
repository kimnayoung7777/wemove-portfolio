import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { getAccessToken } from "../utils/authTokenStore";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
