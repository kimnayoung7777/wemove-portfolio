package kr.co.iei.member.model.dao;

import java.util.*;
import kr.co.iei.member.model.vo.*;
import kr.co.iei.sport.model.vo.Sport;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MemberDao {
  private final SqlSession sqlSession;

  public MemberResponse selectMemberById(Long id) {
    return sqlSession.selectOne("member.selectMemberById", Map.of("memberId", id));
  }

  public List<Sport> selectMemberSports(Long memberId) {
    return sqlSession.selectList("member.selectMemberSports", Map.of("memberId", memberId));
  }

  public int updateMember(Long id, MemberUpdateRequest request) {
    Map<String, Object> p = new HashMap<>();
    p.put("memberId", id);
    p.put("request", request);
    return sqlSession.update("member.updateMember", p);
  }

  public int deleteMemberSports(Long memberId) {
    return sqlSession.delete("member.deleteMemberSports", Map.of("memberId", memberId));
  }

  public int insertMemberSport(Long memberId, Long sportId) {
    return sqlSession.insert(
        "member.insertMemberSport", Map.of("memberId", memberId, "sportId", sportId));
  }

  public List<MemberActivityMeetingResponse> selectHostedActivityMeetings(Long memberId) {
    return sqlSession.selectList("member.selectHostedActivityMeetings", Map.of("memberId", memberId));
  }

  public List<MemberActivityMeetingResponse> selectParticipantActivityMeetings(Long memberId) {
    return sqlSession.selectList(
        "member.selectParticipantActivityMeetings", Map.of("memberId", memberId));
  }

  public int countActiveHostedMeetings(Long memberId) {
    return sqlSession.selectOne("member.countActiveHostedMeetings", Map.of("memberId", memberId));
  }

  public int countActiveHostedMeetingsWithOtherParticipants(Long memberId) {
    return sqlSession.selectOne(
        "member.countActiveHostedMeetingsWithOtherParticipants", Map.of("memberId", memberId));
  }

  public List<MemberActivityMeetingResponse> selectActiveHostedMeetingsWithOtherParticipants(
      Long memberId) {
    return sqlSession.selectList(
        "member.selectActiveHostedMeetingsWithOtherParticipants", Map.of("memberId", memberId));
  }

  public int countActiveParticipatingMeetings(Long memberId) {
    return sqlSession.selectOne(
        "member.countActiveParticipatingMeetings", Map.of("memberId", memberId));
  }

  public List<MemberActivityMeetingResponse> selectActiveParticipatingMeetings(Long memberId) {
    return sqlSession.selectList("member.selectActiveParticipatingMeetings", Map.of("memberId", memberId));
  }

  public int cancelSoloHostedMeetingsForWithdrawal(Long memberId) {
    return sqlSession.update("member.cancelSoloHostedMeetingsForWithdrawal", Map.of("memberId", memberId));
  }

  public int cancelParticipatingMeetingsForWithdrawal(Long memberId) {
    return sqlSession.update(
        "member.cancelParticipatingMeetingsForWithdrawal", Map.of("memberId", memberId));
  }
}
