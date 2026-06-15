package kr.co.iei.report.model.vo;

import lombok.Data;

@Data
public class ReportRequest {
  private Long reporterId;
  private Long meetingId;
  private Long targetUserId;
  private String reason;
  private String content;
}
