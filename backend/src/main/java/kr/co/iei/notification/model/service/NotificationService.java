package kr.co.iei.notification.model.service;

import java.time.LocalDateTime;
import java.util.List;
import kr.co.iei.notification.model.vo.NotificationRecord;

public interface NotificationService {
  List<NotificationRecord> getNotifications(Long userId);

  List<NotificationRecord> getNoticeNotifications(Long userId);

  int countUnread(Long userId);

  void markAllRead(Long userId);

  void deleteNotification(Long userId, Long notificationId);

  void deleteAll(Long userId);

  void sendToUser(Long userId, String type, String title, String message, String sourceId);

  void sendNoticeToAll(String title, String message, String sourceId);

  void sendAccountWarning(Long userId, String reason, String sourceId);

  void sendAccountSuspend(
      Long userId, String reason, int suspendHours, LocalDateTime suspendedUntil, String sourceId);
}
