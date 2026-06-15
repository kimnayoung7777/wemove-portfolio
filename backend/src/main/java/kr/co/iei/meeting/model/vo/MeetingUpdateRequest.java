package kr.co.iei.meeting.model.vo;

import java.sql.Time;
import java.time.*;
import java.util.TimeZone;

import lombok.Data;

@Data
public class MeetingUpdateRequest {
  private Long meetingId;
  private Long hostUserId;
  private Long sportId;
  private Long regionId;
  private String title;
  private String content;
  private String thumbnailImage;
  private String placeName;
  private String address;
  private LocalDate meetingDate;
  private LocalTime startTime;
  private LocalTime endTime;
  private Integer maxMembers;
  private String status;
  private String guideText;
  private String supplies;
  private LocalDateTime deletedAt;

  private Boolean isImageRemoved;//사진 삭제 여부 체크용

}
