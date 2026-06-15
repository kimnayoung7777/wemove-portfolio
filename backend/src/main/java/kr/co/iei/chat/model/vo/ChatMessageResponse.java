package kr.co.iei.chat.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ChatMessageResponse {
  private Long messageId;
  private Long meetingId;
  private Long userId;
  private String nickname;
  private String profileImage;
  private Boolean host;
  private String content;
  private String messageType;
  private LocalDateTime createdAt;
}
