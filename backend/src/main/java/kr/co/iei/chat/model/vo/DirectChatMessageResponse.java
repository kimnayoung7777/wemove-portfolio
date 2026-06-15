package kr.co.iei.chat.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DirectChatMessageResponse {
  private Long messageId;
  private Long roomId;
  private Long userId;
  private String nickname;
  private String profileImage;
  private String content;
  private String messageType;
  private LocalDateTime createdAt;
}
