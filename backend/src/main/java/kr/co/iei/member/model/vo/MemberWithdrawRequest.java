package kr.co.iei.member.model.vo;

import lombok.Data;

@Data
public class MemberWithdrawRequest {
  private String password;
  private Boolean confirmParticipatingMeetings;
}
