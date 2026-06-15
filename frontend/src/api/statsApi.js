import api from "./axiosInstance";

export const getLoginPageStats = () => api.get("/stats/login-page");
