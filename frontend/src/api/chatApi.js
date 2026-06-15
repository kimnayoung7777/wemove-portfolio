import api from "./axiosInstance";

export const getChatRooms = () => api.get("/chat/rooms");

export const getChatMessages = (meetingId) =>
  api.get(`/meetings/${meetingId}/chat/messages`);

export const createChatMessage = (meetingId, content) =>
  api.post(`/meetings/${meetingId}/chat/messages`, { content });

export const leaveMeetingChatRoom = (meetingId) =>
  api.patch(`/meetings/${meetingId}/chat/leave`);

export const getDirectChatRooms = () => api.get("/direct-chat/rooms");

export const createDirectChatRoom = (targetUserId) =>
  api.post("/direct-chat/rooms", { targetUserId });

export const getDirectChatMessages = (roomId) =>
  api.get(`/direct-chat/rooms/${roomId}/messages`);

export const createDirectChatMessage = (roomId, content) =>
  api.post(`/direct-chat/rooms/${roomId}/messages`, { content });

export const leaveDirectChatRoom = (roomId) =>
  api.patch(`/direct-chat/rooms/${roomId}/leave`);
