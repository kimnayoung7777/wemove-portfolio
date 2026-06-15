package kr.co.iei.participant.model.vo;

import java.time.*;
import lombok.Data;

@Data
public class MeetingParticipant {
  private Long participantId;
  private Long meetingId;
  private Long userId;
  private String status;
  private String message;
  private LocalDateTime appliedAt;
  private LocalDateTime approvedAt;
  private LocalDateTime cancelledAt;
  private String nickname;
}
