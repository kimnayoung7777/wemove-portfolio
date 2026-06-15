package kr.co.iei.report.model.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ReportResponse {
  private Long reportId;
  private Long reporterId;
  private String reason;
  private String status;
  private LocalDateTime createdAt;
}
