package kr.co.iei.participant.model.vo;

import lombok.Data;

@Data
public class ParticipantResponse {
  private Long participantId;
  private Long meetingId;
  private Long userId;
  private String nickname;
  private String status;
  private String message;
  private String profileImage;
  private String email;
  private String regionName;
  private String createdAt;
  private Integer birthYear;
  private Integer gender;
  private String sports;
}
