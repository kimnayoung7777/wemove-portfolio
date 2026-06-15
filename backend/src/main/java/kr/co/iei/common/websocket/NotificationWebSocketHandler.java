package kr.co.iei.common.websocket;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import kr.co.iei.auth.util.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandler extends TextWebSocketHandler {
  private final NotificationSessionRegistry sessionRegistry;
  private final JwtTokenProvider jwtTokenProvider;

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    String token = parseQueryParam(session.getUri(), "token");

    if (token == null || !jwtTokenProvider.isValid(token)) {
      session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid notification connection."));
      return;
    }

    Long userId = jwtTokenProvider.parseUserId(token);
    sessionRegistry.add(userId, session);
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    sessionRegistry.remove(session);
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) {
    sessionRegistry.remove(session);
  }

  private String parseQueryParam(URI uri, String name) {
    if (uri == null || uri.getQuery() == null) {
      return null;
    }

    return Arrays.stream(uri.getQuery().split("&"))
        .map((part) -> part.split("=", 2))
        .filter((pair) -> pair.length == 2 && pair[0].equals(name))
        .map((pair) -> URLDecoder.decode(pair[1], StandardCharsets.UTF_8))
        .findFirst()
        .orElse(null);
  }
}
