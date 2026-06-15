package kr.co.iei.admin.model.vo;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.Data;

@Data
public class AdminMeetingResponse {
  private Long meetingId;
  private String title;
  private String sportName;
  private String sportCategory;
  private String regionName;
  private Integer approvedCount;
  private Integer maxMembers;
  private String status;
  private String hostNickname;
  private LocalDate meetingDate;
  private LocalTime startTime;
  private LocalDateTime createdAt;
}
