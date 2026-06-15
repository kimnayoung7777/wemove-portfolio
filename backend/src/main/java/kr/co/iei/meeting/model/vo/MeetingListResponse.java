package kr.co.iei.meeting.model.vo;

import java.time.*;
import lombok.Data;

@Data
public class MeetingListResponse {
  private Long meetingId;
  private String title;
  private String placeName;
  private LocalDate meetingDate;
  private LocalTime startTime;
  private LocalTime endTime;
  private Integer maxMembers;
  private Integer approvedCount;
  private Integer viewCount;
  private String status;
  private String sportName;
  private String regionName;
  private String content;
  private String address;
  private String thumbnailImage;
  private String meetingHostName;
  private String hostProfileImage;

  private String sportId;
  private String category;
  private String statusText;
  private Integer commentCount;

  private String myParticipantStatus;
}
