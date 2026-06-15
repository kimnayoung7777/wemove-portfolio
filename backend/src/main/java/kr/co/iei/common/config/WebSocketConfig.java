package kr.co.iei.common.config;

import java.util.Arrays;
import kr.co.iei.chat.websocket.DirectChatWebSocketHandler;
import kr.co.iei.chat.websocket.MeetingChatWebSocketHandler;
import kr.co.iei.common.websocket.CommonWebSocketHandler;
import kr.co.iei.common.websocket.NotificationWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {
  private final CommonWebSocketHandler commonWebSocketHandler;
  private final MeetingChatWebSocketHandler meetingChatWebSocketHandler;
  private final DirectChatWebSocketHandler directChatWebSocketHandler;
  private final NotificationWebSocketHandler notificationWebSocketHandler;

  @Value("${wemove.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
  private String allowedOriginsProperty;

  private String[] allowedOrigins() {
    return Arrays.stream(allowedOriginsProperty.split(","))
        .map(String::trim)
        .filter((origin) -> !origin.isBlank())
        .toArray(String[]::new);
  }

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
        .addHandler(commonWebSocketHandler, "/ws/email-verifications")
        .setAllowedOrigins(allowedOrigins());

    registry
        .addHandler(meetingChatWebSocketHandler, "/ws/meeting-chat")
        .setAllowedOrigins(allowedOrigins());

    registry
        .addHandler(directChatWebSocketHandler, "/ws/direct-chat")
        .setAllowedOrigins(allowedOrigins());

    registry
        .addHandler(notificationWebSocketHandler, "/ws/notifications")
        .setAllowedOrigins(allowedOrigins());
  }
}
