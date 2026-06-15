package kr.co.iei.member.model.vo;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MemberActivityResponse {
  private List<MemberActivityMeetingResponse> hostedMeetings;
  private List<MemberActivityMeetingResponse> approvedMeetings;
  private List<MemberActivityMeetingResponse> pendingMeetings;
  private List<MemberActivityMeetingResponse> completedMeetings;
}
