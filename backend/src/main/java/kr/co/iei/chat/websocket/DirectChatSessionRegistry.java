package kr.co.iei.chat.websocket;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class DirectChatSessionRegistry {
  private final Map<Long, Set<WebSocketSession>> sessionsByRoomId = new ConcurrentHashMap<>();

  public void add(Long roomId, WebSocketSession session) {
    sessionsByRoomId
        .computeIfAbsent(roomId, (ignored) -> ConcurrentHashMap.newKeySet())
        .add(session);
    session.getAttributes().put("directChatRoomId", roomId);
  }

  public void remove(WebSocketSession session) {
    Object roomIdValue = session.getAttributes().get("directChatRoomId");
    if (!(roomIdValue instanceof Long roomId)) {
      return;
    }

    Set<WebSocketSession> sessions = sessionsByRoomId.get(roomId);
    if (sessions == null) {
      return;
    }

    sessions.remove(session);
    if (sessions.isEmpty()) {
      sessionsByRoomId.remove(roomId);
    }
  }

  public Set<WebSocketSession> getOpenSessions(Long roomId) {
    Set<WebSocketSession> sessions = sessionsByRoomId.get(roomId);
    if (sessions == null) {
      return Set.of();
    }

    sessions.removeIf((session) -> !session.isOpen());
    return Set.copyOf(sessions);
  }
}
