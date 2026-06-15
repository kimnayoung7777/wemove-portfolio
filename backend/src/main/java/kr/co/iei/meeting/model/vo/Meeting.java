package kr.co.iei.meeting.model.vo;

import java.time.*;
import lombok.Data;

@Data
public class Meeting {
  private Long meetingId;
  private Long hostUserId;

  private Long sportId;//
  private Long regionId;//

  private String title;
  private String content;
  private String thumbnailImage;

  private String placeName;
  private String address;

  private LocalDate meetingDate;
  private LocalTime startTime;
  private LocalTime endTime;

  private Integer maxMembers;//

  private String meetingType;
  private String repeatType;
  private String status;

  private String supplies;
  private String guideText;

  private LocalDateTime deletedAt;
}
