import api from "./axiosInstance";

export const getSummary = () => api.get("/admin/summary");
export const getAdminMembers = () => api.get("/admin/members");
export const getAdminRegions = () => api.get("/admin/regions");
export const getAdminMeetings = () => api.get("/admin/meetings");
export const getAdminSports = () => api.get("/sports");
export const createAdminSport = (data) => api.post("/admin/sports", data);
export const updateAdminSport = (sportId, data) =>
  api.put("/admin/sports/" + sportId, data);
export const deleteAdminSport = (sportId) =>
  api.delete("/admin/sports/" + sportId);
export const getAdminReports = () => api.get("/admin/reports");
export const updateAdminMeetingStatus = (meetingId, status) =>
  api.patch("/admin/meetings/" + meetingId + "/status", { status });
export const resolveReport = (id) =>
  api.patch("/admin/reports/" + id + "/resolve");
export const rejectReport = (id) =>
  api.patch("/admin/reports/" + id + "/reject");
export const processAdminReport = (reportId, payload) => {
  return api.post(`/admin/reports/${reportId}/process`, payload);
};
