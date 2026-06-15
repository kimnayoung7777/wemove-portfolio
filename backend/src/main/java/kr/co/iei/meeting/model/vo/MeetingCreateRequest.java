package kr.co.iei.meeting.model.vo;

import java.time.*;
import lombok.Data;

@Data
public class MeetingCreateRequest {
  private Long hostUserId;
  private Long sportId;
  private Long regionId;

  private String title;
  private String content;

  private String placeName;
  private String address;

  private String meetingDate;
  private String startTime;
  private String endTime;

  private Integer maxMembers;

  private String meetingType;
  private String repeatType;

  private String supplies;
  private String guideText;

  private String status;
}
