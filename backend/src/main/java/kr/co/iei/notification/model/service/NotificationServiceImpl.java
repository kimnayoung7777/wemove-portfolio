package kr.co.iei.notification.model.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import kr.co.iei.admin.model.service.AccountSanctionMessageUtil;
import kr.co.iei.common.websocket.NotificationWebSocketBroadcaster;
import kr.co.iei.notification.model.dao.NotificationDao;
import kr.co.iei.notification.model.vo.NotificationRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
  private static final int DEFAULT_LIMIT = 50;
  private static final ZoneId KOREA_ZONE_ID = ZoneId.of("Asia/Seoul");

  private final NotificationDao notificationDao;
  private final NotificationWebSocketBroadcaster notificationWebSocketBroadcaster;

  @Override
  public List<NotificationRecord> getNotifications(Long userId) {
    requireUser(userId);
    List<NotificationRecord> notifications = notificationDao.selectNotifications(userId, DEFAULT_LIMIT);
    notifications.forEach(this::restoreSourceId);
    return notifications;
  }

  @Override
  public List<NotificationRecord> getNoticeNotifications(Long userId) {
    requireUser(userId);
    List<NotificationRecord> notifications = notificationDao.selectNoticeNotifications(userId);
    notifications.forEach(this::restoreSourceId);
    return notifications;
  }

  @Override
  public int countUnread(Long userId) {
    requireUser(userId);
    return notificationDao.countUnread(userId);
  }

  @Override
  public void markAllRead(Long userId) {
    requireUser(userId);
    notificationDao.markAllRead(userId);
  }

  @Override
  public void deleteNotification(Long userId, Long notificationId) {
    requireUser(userId);
    if (notificationId == null) {
      throw new IllegalArgumentException("삭제할 알림 정보가 없습니다.");
    }
    notificationDao.deleteNotification(userId, notificationId);
  }

  @Override
  public void deleteAll(Long userId) {
    requireUser(userId);
    notificationDao.deleteAll(userId);
  }

  @Override
  public void sendToUser(Long userId, String type, String title, String message, String sourceId) {
    dispatch(userId, buildRecord(userId, type, title, message, sourceId, false, null, null));
  }

  @Override
  public void sendNoticeToAll(String title, String message, String sourceId) {
    if (title == null || title.isBlank()) {
      return;
    }

    for (Long userId : notificationDao.selectActiveUserIds()) {
      dispatch(userId, buildRecord(userId, "notice", title, message, sourceId, false, null, null));
    }
  }

  @Override
  public void sendAccountWarning(Long userId, String reason, String sourceId) {
    String notice = AccountSanctionMessageUtil.buildWarningNotice(reason);
    dispatch(
        userId,
        buildRecord(
            userId, "accountWarning", "관리자 경고", notice, sourceId, false, null, null));
  }

  @Override
  public void sendAccountSuspend(
      Long userId,
      String reason,
      int suspendHours,
      LocalDateTime suspendedUntil,
      String sourceId) {
    String notice =
        AccountSanctionMessageUtil.buildSuspendNotice(reason, suspendHours, suspendedUntil);
    dispatch(
        userId,
        buildRecord(
            userId,
            "accountSuspend",
            "계정 정지 안내",
            notice,
            sourceId,
            true,
            suspendedUntil,
            suspendHours));
  }

  private NotificationRecord buildRecord(
      Long userId,
      String type,
      String title,
      String message,
      String sourceId,
      boolean forceLogout,
      LocalDateTime suspendedUntil,
      Integer suspendHours) {
    NotificationRecord notification = new NotificationRecord();
    notification.setUserId(userId);
    notification.setType(type);
    notification.setTitle(title);
    notification.setMessage(message);
    notification.setSourceId(sourceId);
    applyTarget(notification, sourceId);
    notification.setForceLogout(forceLogout);
    notification.setSuspendedUntil(suspendedUntil);
    notification.setSuspendHours(suspendHours);
    notification.setIsRead(false);
    notification.setCreatedAt(LocalDateTime.now(KOREA_ZONE_ID));
    return notification;
  }

  private void dispatch(Long userId, NotificationRecord notification) {
    if (userId == null || notification.getTitle() == null || notification.getTitle().isBlank()) {
      return;
    }

    notificationDao.insertNotification(notification);
    restoreSourceId(notification);

    Runnable broadcaster = () -> notificationWebSocketBroadcaster.sendToUser(userId, notification);

    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              broadcaster.run();
            }
          });
      return;
    }

    broadcaster.run();
  }

  private void applyTarget(NotificationRecord notification, String sourceId) {
    if (notification == null || sourceId == null || sourceId.isBlank()) {
      return;
    }

    String[] parts = sourceId.split(":", 2);
    if (parts.length != 2) {
      return;
    }

    try {
      notification.setTargetType(parts[0]);
      notification.setTargetId(Long.valueOf(parts[1]));
      if ("meetingChat".equals(parts[0])) {
        notification.setChatKind("MEETING");
        notification.setSourceId(parts[1]);
      } else if ("directChat".equals(parts[0])) {
        notification.setChatKind("DIRECT");
        notification.setSourceId(parts[1]);
      }
    } catch (NumberFormatException ignored) {
      notification.setTargetType(parts[0]);
    }
  }

  private void restoreSourceId(NotificationRecord notification) {
    if (notification == null || notification.getSourceId() != null) {
      return;
    }

    if (notification.getTargetType() != null && notification.getTargetId() != null) {
      if ("meetingChat".equals(notification.getTargetType())) {
        notification.setChatKind("MEETING");
        notification.setSourceId(String.valueOf(notification.getTargetId()));
        return;
      }
      if ("directChat".equals(notification.getTargetType())) {
        notification.setChatKind("DIRECT");
        notification.setSourceId(String.valueOf(notification.getTargetId()));
        return;
      }
      notification.setSourceId(notification.getTargetType() + ":" + notification.getTargetId());
    }
  }

  private void requireUser(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("로그인이 필요합니다.");
    }
  }
}
