package kr.co.iei.chat.websocket;

import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.chat.model.service.DirectChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class DirectChatWebSocketHandler extends TextWebSocketHandler {
  private final DirectChatSessionRegistry sessionRegistry;
  private final JwtTokenProvider jwtTokenProvider;
  private final DirectChatService directChatService;

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    Long roomId = parseLongQueryParam(session.getUri(), "roomId");
    String token = parseQueryParam(session.getUri(), "token");

    if (roomId == null || token == null || !jwtTokenProvider.isValid(token)) {
      session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid chat connection."));
      return;
    }

    Long userId = jwtTokenProvider.parseUserId(token);
    if (!directChatService.canAccess(roomId, userId)) {
      session.close(CloseStatus.POLICY_VIOLATION.withReason("Forbidden direct chat room."));
      return;
    }

    sessionRegistry.add(roomId, session);
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

