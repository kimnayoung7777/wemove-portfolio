package kr.co.iei.common.websocket;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class WebSocketSessionRegistry {
  private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

  public void add(WebSocketSession session) {
    sessions.add(session);
  }

  public void remove(WebSocketSession session) {
    sessions.remove(session);
  }

  public Set<WebSocketSession> getOpenSessions() {
    sessions.removeIf((session) -> !session.isOpen());
    return Set.copyOf(sessions);
  }
}
