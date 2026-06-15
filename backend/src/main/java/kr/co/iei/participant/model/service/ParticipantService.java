package kr.co.iei.participant.model.service;

import java.util.List;
import kr.co.iei.participant.model.vo.*;

public interface ParticipantService {
  void apply(Long meetingId, ParticipantRequest request);

  List<ParticipantResponse> getParticipants(Long meetingId);

  void approve(Long participantId);

  void reject(Long participantId);

  void cancel(Long participantId);

  void cancelApproval(Long participantId);
}
