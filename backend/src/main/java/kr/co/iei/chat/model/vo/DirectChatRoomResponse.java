package kr.co.iei.chat.model.vo;

import lombok.Data;



@Data
public class DirectChatRoomResponse {
  private Long roomId;
  private Long targetUserId;
  private String targetNickname;
  private String targetProfileImage;
  private Long lastMessageId;
  private String lastMessage;
  private String lastMessageAt;
}
