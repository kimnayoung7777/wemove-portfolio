package kr.co.iei.common.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class CommonWebSocketHandler extends TextWebSocketHandler {
  private final WebSocketSessionRegistry sessionRegistry;

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    sessionRegistry.add(session);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) {
    // 현재는 서버 이벤트 수신 용도입니다. 클라이언트 메시지는 추후 기능에서 확장합니다.
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    sessionRegistry.remove(session);
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) {
    sessionRegistry.remove(session);
  }
}
