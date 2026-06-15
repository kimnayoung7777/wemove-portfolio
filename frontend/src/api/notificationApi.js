import api from "./axiosInstance";

export const getNotifications = () => api.get("/notifications");

export const getNoticeNotifications = () => api.get("/notifications/notices");

export const getUnreadNotificationCount = () =>
  api.get("/notifications/unread-count");

export const markNotificationsReadAll = () =>
  api.patch("/notifications/read-all");

export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`);

export const deleteNotifications = () => api.delete("/notifications");

export const broadcastNotice = (message, title = "공지사항") =>
  api.post("/notifications/notice", { title, message });
