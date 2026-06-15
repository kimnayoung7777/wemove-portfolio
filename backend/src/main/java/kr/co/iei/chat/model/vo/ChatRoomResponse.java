package kr.co.iei.chat.model.vo;

import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Data;

@Data
public class ChatRoomResponse {
  private Long meetingId;
  private String title;
  private String content;
  private String sportName;
  private String regionName;
  private String placeName;
  private String address;
  private LocalDate meetingDate;
  private LocalTime startTime;
  private String status;
  private Long hostUserId;
  private String hostNickname;
  private Long lastMessageId;
  private String lastMessage;
  private String lastMessageAt;
}
