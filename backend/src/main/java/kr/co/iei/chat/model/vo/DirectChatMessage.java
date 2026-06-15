package kr.co.iei.chat.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DirectChatMessage {
  private Long messageId;
  private Long roomId;
  private Long userId;
  private String content;
  private String messageType;
  private LocalDateTime createdAt;
}
