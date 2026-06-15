package kr.co.iei.member.model.exception;

import java.util.List;
import kr.co.iei.member.model.vo.MemberActivityMeetingResponse;
import lombok.Getter;

@Getter
public class MemberWithdrawBlockedException extends RuntimeException {
  private final String code;
  private final List<MemberActivityMeetingResponse> meetings;

  public MemberWithdrawBlockedException(
      String code, String message, List<MemberActivityMeetingResponse> meetings) {
    super(message);
    this.code = code;
    this.meetings = meetings == null ? List.of() : meetings;
  }
}
