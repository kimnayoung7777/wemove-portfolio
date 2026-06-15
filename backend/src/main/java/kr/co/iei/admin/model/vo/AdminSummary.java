package kr.co.iei.admin.model.vo;

import lombok.Data;

@Data
public class AdminSummary {
  private Integer totalMembers;
  private Integer totalMeetings;
  private Integer pendingReports;
  private Integer totalSports;
}
