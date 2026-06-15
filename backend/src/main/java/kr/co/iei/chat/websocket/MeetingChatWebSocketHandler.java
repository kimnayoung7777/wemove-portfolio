package kr.co.iei.chat.websocket;

import java.net.URI;
import java.util.Arrays;
import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.chat.model.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class MeetingChatWebSocketHandler extends TextWebSocketHandler {
  private final MeetingChatSessionRegistry sessionRegistry;
  private final JwtTokenProvider jwtTokenProvider;
  private final ChatService chatService;

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    Long meetingId = parseLongQueryParam(session.getUri(), "meetingId");
    String token = parseQueryParam(session.getUri(), "token");

    if (meetingId == null || token == null || !jwtTokenProvider.isValid(token)) {
      session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid chat connection."));
      return;
    }

    Long userId = jwtTokenProvider.parseUserId(token);
    if (!chatService.canAccess(meetingId, userId)) {
      session.close(CloseStatus.POLICY_VIOLATION.withReason("Forbidden chat room."));
      return;
    }

    sessionRegistry.add(meetingId, session);
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    sessionRegistry.remove(session);
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) {
    sessionRegistry.remove(session);
  }

  private Long parseLongQueryParam(URI uri, String name) {
    String value = parseQueryParam(uri, name);
    if (value == null || value.isBlank()) {
      return null;
    }

    try {
      return Long.valueOf(value);
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private String parseQueryParam(URI uri, String name) {
    if (uri == null || uri.getQuery() == null) {
      return null;
    }

    return Arrays.stream(uri.getQuery().split("&"))
        .map((part) -> part.split("=", 2))
        .filter((pair) -> pair.length == 2 && pair[0].equals(name))
        .map((pair) -> pair[1])
        .findFirst()
        .orElse(null);
  }
}
