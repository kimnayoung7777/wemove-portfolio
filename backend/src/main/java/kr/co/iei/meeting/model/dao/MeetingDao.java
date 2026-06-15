package kr.co.iei.meeting.model.dao;

import java.time.LocalDateTime;
import java.util.*;
import kr.co.iei.meeting.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MeetingDao {
  private final SqlSession sqlSession;

  public List<MeetingListResponse> selectMeetingList(MeetingSearchCondition c) {
    return sqlSession.selectList("meeting.selectMeetingList", c);
  }

  public int selectMeetingCount(MeetingSearchCondition c) {
    return sqlSession.selectOne("meeting.selectMeetingCount", c);
  }

  public List<Map<String, Object>> selectTopRegions() {
    return sqlSession.selectList("meeting.selectTopRegions");
  }

  public MeetingDetailResponse selectMeetingDetail(Long id) {
    return sqlSession.selectOne("meeting.selectMeetingDetail", id);
  }

  public int insertMeeting(Meeting m) {
    return sqlSession.insert("meeting.insertMeeting", m);
  }

  public int updateMeeting(MeetingUpdateRequest request) {
    return sqlSession.update("meeting.updateMeeting", request);
  }

  public Long lockUserSchedule(Long userId) {
    return sqlSession.selectOne("meeting.lockUserSchedule", userId);
  }

  public List<MeetingDetailResponse> selectUserScheduleConflicts(
      Long userId,
      LocalDateTime startDateTime,
      LocalDateTime endDateTime,
      Long excludedMeetingId) {
    Map<String, Object> params = new HashMap<>();
    params.put("userId", userId);
    params.put("startDateTime", startDateTime);
    params.put("endDateTime", endDateTime);
    params.put("excludedMeetingId", excludedMeetingId);
    return sqlSession.selectList("meeting.selectUserScheduleConflicts", params);
  }

  public int softDeleteMeeting(Long id) {
    return sqlSession.update("meeting.softDeleteMeeting", id);
  }

  public int updateMeetingStatus(Long id, String status) {
    return sqlSession.update(
            "meeting.updateMeetingStatus", Map.of("meetingId", id, "status", status));
  }

  public Integer selectMaxMembers(Long id) {
    return sqlSession.selectOne("meeting.selectMaxMembers", id);
  }

  public Long selectHostUserId(Long id) {
    return sqlSession.selectOne("meeting.selectHostUserId", id);
  }

  public int startDueMeetings() {
    return sqlSession.update("meeting.startDueMeetings");
  }

  public int completeOverdueOngoingMeetings() {
    return sqlSession.update("meeting.completeOverdueOngoingMeetings");
  }

  public List<Map<String, Object>> selectTodayReminderNotificationTargets() {
    return sqlSession.selectList("meeting.selectTodayReminderNotificationTargets");
  }

  public List<Map<String, Object>> selectCompletedChatCloseTargets() {
    return sqlSession.selectList("meeting.selectCompletedChatCloseTargets");
  }

  public List<MeetingListResponse> selectMainMeetingList(Map<String, Object> params) {
    return sqlSession.selectList("meeting.selectMainMeetingList", params);
  }

  public List<MeetingListResponse> selectMainMeetingListByIds(List<Long> meetingIds) {
    return sqlSession.selectList("meeting.selectMainMeetingListByIds", meetingIds);
  }
}
