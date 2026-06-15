package kr.co.iei.member.model.vo;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.Data;

@Data
public class MemberActivityMeetingResponse {
  private Long meetingId;
  private String title;
  private String placeName;
  private LocalDate meetingDate;
  private LocalTime startTime;
  private LocalTime endTime;
  private Integer maxMembers;
  private Integer approvedCount;
  private String status;
  private String sportName;
  private String regionName;
  private String thumbnailImage;
  private String hostNickname;
  private String participationStatus;
  private LocalDateTime createdAt;
}
