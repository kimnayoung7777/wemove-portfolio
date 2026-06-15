package kr.co.iei.chat.model.vo;

import lombok.Data;

@Data
public class DirectChatRoomCreateRequest {
  private Long targetUserId;
}