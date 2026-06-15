package kr.co.iei.stats.model.vo;

import lombok.Data;

@Data
public class LoginPageStatsResponse {
  private Integer totalMembers;
  private Integer totalMeetings;
  private Integer completedMeetings;
}
