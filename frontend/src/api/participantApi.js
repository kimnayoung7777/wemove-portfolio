import api from "./axiosInstance";
export const applyMeeting = (m, d) =>
  api.post("/meetings/" + m + "/participants", d);
export const getParticipants = (m) =>
  api.get("/meetings/" + m + "/participants");
export const approveParticipant = (id) =>
  api.patch("/participants/" + id + "/approve");
export const rejectParticipant = (id) =>
  api.patch("/participants/" + id + "/reject");
export const cancelParticipant = (id) =>
  api.patch("/participants/" + id + "/cancel");
export const cancelApproval = (id) =>
  api.patch("/participants/" + id + "/cancel-approval");

