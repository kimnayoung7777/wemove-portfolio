package kr.co.iei.common.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import kr.co.iei.notification.model.vo.NotificationRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketBroadcaster {
  private final NotificationSessionRegistry sessionRegistry;
  private final ObjectMapper objectMapper;

  public void sendToUser(Long userId, NotificationRecord notification) {
    if (userId == null || notification == null) {
      return;
    }

    String message = toJson(toPayload(notification));

    for (WebSocketSession session : sessionRegistry.getOpenSessions(userId)) {
      send(session, message);
    }
  }

  private Map<String, Object> toPayload(NotificationRecord notification) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("notificationId", notification.getNotificationId());
    payload.put("id", notification.getNotificationId());
    payload.put("type", notification.getType());
    payload.put("title", notification.getTitle());
    payload.put("message", notification.getMessage());
    payload.put("targetType", notification.getTargetType());
    payload.put("targetId", notification.getTargetId());
    payload.put("chatKind", notification.getChatKind());
    payload.put("sourceId", notification.getSourceId());
    payload.put("isRead", notification.getIsRead());
    payload.put(
        "createdAt",
        notification.getCreatedAt() == null ? null : notification.getCreatedAt().toString());
    if (notification.getForceLogout() != null) {
      payload.put("forceLogout", notification.getForceLogout());
    }
    if (notification.getSuspendedUntil() != null) {
      payload.put("suspendedUntil", notification.getSuspendedUntil().toString());
    }
    if (notification.getSuspendHours() != null) {
      payload.put("suspendHours", notification.getSuspendHours());
    }
    return payload;
  }

  private String toJson(Object payload) {
    try {
      return objectMapper.writeValueAsString(payload);
    } catch (IOException exception) {
      throw new IllegalArgumentException("알림 메시지를 JSON으로 변환할 수 없습니다.", exception);
    }
  }

  private void send(WebSocketSession session, String message) {
    try {
      session.sendMessage(new TextMessage(message));
    } catch (IOException ignored) {
      sessionRegistry.remove(session);
    }
  }
}
