package kr.co.iei.report.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class Report {
  private Long reportId;
  private Long reporterId;
  private Long meetingId;
  private Long targetUserId;
  private String reason;
  private String content;
  private String status;
  private LocalDateTime createdAt;
}
