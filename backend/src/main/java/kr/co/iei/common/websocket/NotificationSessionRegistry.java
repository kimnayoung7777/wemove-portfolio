package kr.co.iei.common.websocket;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class NotificationSessionRegistry {
  private final Map<Long, Set<WebSocketSession>> sessionsByUserId = new ConcurrentHashMap<>();

  public void add(Long userId, WebSocketSession session) {
    sessionsByUserId
        .computeIfAbsent(userId, (ignored) -> ConcurrentHashMap.newKeySet())
        .add(session);
    session.getAttributes().put("userId", userId);
  }

  public void remove(WebSocketSession session) {
    Object userIdValue = session.getAttributes().get("userId");
    if (!(userIdValue instanceof Long userId)) {
      return;
    }

    Set<WebSocketSession> sessions = sessionsByUserId.get(userId);
    if (sessions == null) {
      return;
    }

    sessions.remove(session);
    if (sessions.isEmpty()) {
      sessionsByUserId.remove(userId);
    }
  }

  public Set<WebSocketSession> getOpenSessions(Long userId) {
    Set<WebSocketSession> sessions = sessionsByUserId.get(userId);
    if (sessions == null) {
      return Set.of();
    }

    sessions.removeIf((session) -> !session.isOpen());
    return Set.copyOf(sessions);
  }
}
