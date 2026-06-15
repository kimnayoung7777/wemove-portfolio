import api from "./axiosInstance";

export const recordSearchKeyword = (keyword) =>
  api.post("/search/keywords", {
    keyword: String(keyword ?? "").trim(),
  });

export const getPopularKeywords = (limit = 8) =>
  api.get("/search/popular", { params: { limit } });
