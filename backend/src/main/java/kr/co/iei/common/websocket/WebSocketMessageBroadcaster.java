package kr.co.iei.common.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
@RequiredArgsConstructor
public class WebSocketMessageBroadcaster {
  private final WebSocketSessionRegistry sessionRegistry;
  private final ObjectMapper objectMapper;

  public void broadcast(Object payload) {
    String message = toJson(payload);

    for (WebSocketSession session : sessionRegistry.getOpenSessions()) {
      send(session, message);
    }
  }

  private String toJson(Object payload) {
    try {
      return objectMapper.writeValueAsString(payload);
    } catch (IOException exception) {
      throw new IllegalArgumentException("웹소켓 메시지를 JSON으로 변환할 수 없습니다.", exception);
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
