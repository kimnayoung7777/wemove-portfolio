package kr.co.iei.participant.model.dao;

import java.util.*;
import kr.co.iei.participant.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ParticipantDao {
  private final SqlSession sqlSession;

  public Integer exists(Long meetingId, Long userId) {
    return sqlSession.selectOne(
        "participant.exists", Map.of("meetingId", meetingId, "userId", userId));
  }

  public MeetingParticipant selectParticipantByMeetingIdAndUserId(Long meetingId, Long userId) {
    return sqlSession.selectOne(
        "participant.selectParticipantByMeetingIdAndUserId", Map.of("meetingId", meetingId, "userId", userId));
  }

  public int updateParticipantForReapply(MeetingParticipant p) {
    return sqlSession.update("participant.updateParticipantForReapply", p);
  }

  public int insertParticipant(MeetingParticipant p) {
    return sqlSession.insert("participant.insertParticipant", p);
  }

  public List<ParticipantResponse> selectParticipants(Long meetingId) {
    return sqlSession.selectList("participant.selectParticipants", meetingId);
  }

  public ParticipantResponse selectParticipant(Long participantId) {
    return sqlSession.selectOne("participant.selectParticipant", participantId);
  }

  public int updateStatus(Long participantId, String status) {
    return sqlSession.update(
        "participant.updateStatus", Map.of("participantId", participantId, "status", status));
  }

  public Integer countApprovedByMeetingId(Long meetingId) {
    return sqlSession.selectOne("participant.countApprovedByMeetingId", meetingId);
  }

  public Long selectMeetingIdByParticipantId(Long participantId) {
    return sqlSession.selectOne("participant.selectMeetingIdByParticipantId", participantId);
  }

  public java.util.List<Long> selectApprovedUserIds(Long meetingId, Long excludedUserId) {
    Map<String, Object> params = new HashMap<>();
    params.put("meetingId", meetingId);
    params.put("excludedUserId", excludedUserId);
    return sqlSession.selectList("participant.selectApprovedUserIds", params);
  }
}
