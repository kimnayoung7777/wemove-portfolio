package kr.co.iei.chat.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DirectChatRoom {
  private Long roomId;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
