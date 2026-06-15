import api from "./axiosInstance";

export const signup = (data) => api.post("/auth/signup", data);
export const login = (data) => api.post("/auth/login", data);
export const refreshSession = () => api.post("/auth/refresh");
export const logout = () => api.post("/auth/logout");
export const checkSessionStatus = () => api.get("/auth/session-status");
export const sendEmailVerification = (email) =>
  api.post("/auth/email/send", { email });
export const sendAccountRecoveryEmail = (email, purpose) =>
  api.post("/auth/account/email/send", { email, purpose });
export const findLoginId = (data) => api.post("/auth/account/find-login-id", data);
export const resetPassword = (data) =>
  api.post("/auth/account/reset-password", data);
