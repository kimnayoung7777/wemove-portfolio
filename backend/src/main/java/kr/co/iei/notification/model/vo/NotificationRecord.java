package kr.co.iei.notification.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class NotificationRecord {
  private Long notificationId;
  private Long userId;
  private String type;
  private String title;
  private String message;
  private String targetType;
  private Long targetId;
  private String sourceId;
  private String chatKind;
  private Boolean forceLogout;
  private LocalDateTime suspendedUntil;
  private Integer suspendHours;
  private Boolean isRead;
  private LocalDateTime createdAt;
  private LocalDateTime readAt;
}
