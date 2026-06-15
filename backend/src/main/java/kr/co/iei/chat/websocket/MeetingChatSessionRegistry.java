package kr.co.iei.chat.websocket;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class MeetingChatSessionRegistry {
  private final Map<Long, Set<WebSocketSession>> sessionsByMeetingId = new ConcurrentHashMap<>();

  public void add(Long meetingId, WebSocketSession session) {
    sessionsByMeetingId
        .computeIfAbsent(meetingId, (ignored) -> ConcurrentHashMap.newKeySet())
        .add(session);
    session.getAttributes().put("meetingId", meetingId);
  }

  public void remove(WebSocketSession session) {
    Object meetingIdValue = session.getAttributes().get("meetingId");
    if (!(meetingIdValue instanceof Long meetingId)) {
      return;
    }

    Set<WebSocketSession> sessions = sessionsByMeetingId.get(meetingId);
    if (sessions == null) {
      return;
    }

    sessions.remove(session);
    if (sessions.isEmpty()) {
      sessionsByMeetingId.remove(meetingId);
    }
  }

  public Set<WebSocketSession> getOpenSessions(Long meetingId) {
    Set<WebSocketSession> sessions = sessionsByMeetingId.get(meetingId);
    if (sessions == null) {
      return Set.of();
    }

    sessions.removeIf((session) -> !session.isOpen());
    return Set.copyOf(sessions);
  }
}
