package kr.co.iei.admin.model.dao;

import java.util.*;
import kr.co.iei.admin.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AdminDao {
  private final SqlSession sqlSession;

  public AdminSummary selectSummary() {
    return sqlSession.selectOne("admin.selectSummary");
  }

  public List<AdminMemberResponse> selectMembers() {
    return sqlSession.selectList("admin.selectMembers");
  }

  public List<AdminRegionResponse> selectRegions() {
    return sqlSession.selectList("admin.selectRegions");
  }

  public List<AdminMeetingResponse> selectMeetings() {
    return sqlSession.selectList("admin.selectMeetings");
  }

  public List<AdminReportResponse> selectReports() {
    return sqlSession.selectList("admin.selectReports");
  }

  public Integer selectReportTargetUserId(Long reportId) {
    return sqlSession.selectOne("admin.selectReportTargetUserId", reportId);
  }

  public Integer selectReportReporterId(Long reportId) {
    return sqlSession.selectOne("admin.selectReportReporterId", reportId);
  }

  public int updateMemberStatus(Long userId, String status) {
    return sqlSession.update(
        "admin.updateMemberStatus", Map.of("userId", userId, "status", status));
  }

  public int updateMeetingStatus(Long meetingId, String status) {
    return sqlSession.update(
        "admin.updateMeetingStatus",
        Map.of("meetingId", meetingId, "status", status));
  }

  public void updateReportStatusToProcessed(Long reportId, String status) {
    Map<String, Object> params = new HashMap<>();
    params.put("reportId", reportId);
    params.put("status", status);
    sqlSession.update("admin.updateReportStatusToProcessed", params);
  }

  public void suspendUser(Long userId, int suspendDuration, String suspendReason) {
    Map<String, Object> params = new HashMap<>();
    params.put("userId", userId);
    params.put("suspendDuration", suspendDuration);
    params.put("suspendReason", suspendReason);
    sqlSession.update("admin.suspendUser", params);
  }

  public int cancelMeetingsHostedByUser(Long userId) {
    return sqlSession.update("admin.cancelMeetingsHostedByUser", userId);
  }

  public int cancelParticipationsByUser(Long userId) {
    return sqlSession.update("admin.cancelParticipationsByUser", userId);
  }

  public List<Map<String, Object>> selectHostedMeetingCancelNotificationTargets(Long userId) {
    return sqlSession.selectList("admin.selectHostedMeetingCancelNotificationTargets", userId);
  }
}
