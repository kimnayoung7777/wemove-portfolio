package kr.co.iei.participant.model.service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import kr.co.iei.chat.model.service.ChatService;
import kr.co.iei.meeting.model.dao.MeetingDao;
import kr.co.iei.meeting.model.vo.MeetingDetailResponse;
import kr.co.iei.notification.model.service.NotificationService;
import kr.co.iei.participant.model.dao.ParticipantDao;
import kr.co.iei.participant.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ParticipantServiceImpl implements ParticipantService {
  private final ParticipantDao participantDao;
  private final MeetingDao meetingDao;
  private final ChatService chatService;
  private final NotificationService notificationService;

  @Transactional
  public void apply(Long meetingId, ParticipantRequest req) {
    MeetingDetailResponse meeting = meetingDao.selectMeetingDetail(meetingId);
    if (meeting == null) {
      throw new IllegalArgumentException("존재하지 않는 모임입니다.");
    }
    if (!"RECRUITING".equals(meeting.getStatus())) {
      throw new IllegalArgumentException("모집중인 모임만 참여 신청할 수 있습니다.");
    }

    Long hostUserId = meetingDao.selectHostUserId(meetingId);
    if (hostUserId != null && hostUserId.equals(req.getUserId())) {
      throw new IllegalArgumentException("주최자는 자신의 모임에 참여 신청할 수 없습니다.");
    }

    meetingDao.lockUserSchedule(req.getUserId());
    LocalTime targetEndTime =
        meeting.getEndTime() == null
            ? meeting.getStartTime().plusHours(2)
            : meeting.getEndTime();
    LocalDateTime targetStartDateTime =
        LocalDateTime.of(meeting.getMeetingDate(), meeting.getStartTime());
    LocalDateTime targetEndDateTime =
        LocalDateTime.of(
            targetEndTime.isAfter(meeting.getStartTime())
                ? meeting.getMeetingDate()
                : meeting.getMeetingDate().plusDays(1),
            targetEndTime);
    List<MeetingDetailResponse> conflicts =
        meetingDao.selectUserScheduleConflicts(
            req.getUserId(),
            targetStartDateTime,
            targetEndDateTime,
            meetingId);
    if (!conflicts.isEmpty()) {
      MeetingDetailResponse conflict = conflicts.get(0);
      LocalTime conflictEnd =
          conflict.getEndTime() == null
              ? conflict.getStartTime().plusHours(2)
              : conflict.getEndTime();
      throw new IllegalArgumentException(
          "해당 시간대에 이미 '"
              + conflict.getTitle()
              + "' 모임이 있습니다. ("
              + conflict.getStartTime()
              + " ~ "
              + (conflict.getEndTime() != null
                      && !conflict.getEndTime().isAfter(conflict.getStartTime())
                  ? "다음 날 "
                  : "")
              + conflictEnd
              + ")");
    }

    MeetingParticipant existing = participantDao.selectParticipantByMeetingIdAndUserId(meetingId, req.getUserId());
    Long participantId;
    if (existing != null) {
      if ("PENDING".equals(existing.getStatus()) || "APPROVED".equals(existing.getStatus())) {
        throw new IllegalArgumentException("이미 신청한 모임입니다.");
      }
      if ("REJECTED".equals(existing.getStatus())) {
        throw new IllegalArgumentException("거절된 모임에는 다시 신청할 수 없습니다.");
      }
      existing.setStatus("PENDING");
      existing.setMessage(req.getMessage());
      participantDao.updateParticipantForReapply(existing);
      participantId = existing.getParticipantId();
    } else {
      MeetingParticipant p = new MeetingParticipant();
      p.setMeetingId(meetingId);
      p.setUserId(req.getUserId());
      p.setMessage(req.getMessage());
      p.setStatus("PENDING");
      participantDao.insertParticipant(p);
      participantId = p.getParticipantId();
    }

    ParticipantResponse participant = participantDao.selectParticipant(participantId);
    String nickname =
        participant == null || participant.getNickname() == null ? "참가자" : participant.getNickname();
    notificationService.sendToUser(
        hostUserId,
        "meetingRequest",
        "모임 신청이 도착했습니다",
        nickname + "님이 '" + meeting.getTitle() + "' 모임에 참가 신청했습니다.",
        "meeting:" + meetingId);
  }

  public List<ParticipantResponse> getParticipants(Long meetingId) {
    return participantDao.selectParticipants(meetingId);
  }

  @Transactional
  public void approve(Long participantId) {
    participantDao.updateStatus(participantId, "APPROVED");
    Long meetingId = participantDao.selectMeetingIdByParticipantId(participantId);
    MeetingDetailResponse meeting = meetingDao.selectMeetingDetail(meetingId);
    ParticipantResponse participant = participantDao.selectParticipant(participantId);
    if (participant != null) {
      String nickname = participant.getNickname() == null ? "참가자" : participant.getNickname();
      chatService.createSystemMessage(
          meetingId, participant.getUserId(), nickname + "님의 모임 가입이 완료되었습니다.");
      notificationService.sendToUser(
          participant.getUserId(),
          "meetingApproved",
          "모임 신청이 승인되었습니다",
          "'" + meeting.getTitle() + "' 모임 참여가 승인되었습니다.",
          "meeting:" + meetingId);
    }
    Integer approved = participantDao.countApprovedByMeetingId(meetingId);
    Integer max = meetingDao.selectMaxMembers(meetingId);

    // [수정] sjm_0528의 단일 행 if문 구조에 중괄호 {}를 안전하게 씌워 하단의 닫는 괄호와 짝을 맞췄습니다.
    if (approved != null && max != null && approved >= max) {
      meetingDao.updateMeetingStatus(meetingId, "CLOSED");
    }
  }

  @Transactional
  public void reject(Long participantId) {
    Long meetingId = participantDao.selectMeetingIdByParticipantId(participantId);
    MeetingDetailResponse meeting = meetingId == null ? null : meetingDao.selectMeetingDetail(meetingId);
    ParticipantResponse participant = participantDao.selectParticipant(participantId);
    participantDao.updateStatus(participantId, "REJECTED");
    if (meeting != null && participant != null) {
      notificationService.sendToUser(
          participant.getUserId(),
          "meetingRejected",
          "모임 신청이 거절되었습니다",
          "'" + meeting.getTitle() + "' 모임 참여가 거절되었습니다.",
          "meeting:" + meetingId);
    }
  }

  @Transactional
  public void cancel(Long participantId) {
    ParticipantResponse participant = participantDao.selectParticipant(participantId);
    Long meetingId = participant == null ? null : participant.getMeetingId();
    MeetingDetailResponse meeting = meetingId == null ? null : meetingDao.selectMeetingDetail(meetingId);
    participantDao.updateStatus(participantId, "CANCELLED");
    if (participant == null || meeting == null || meeting.getHostUserId() == null) {
      return;
    }

    String nickname = participant.getNickname() == null ? "참가자" : participant.getNickname();
    boolean wasApproved = "APPROVED".equals(participant.getStatus());
    notificationService.sendToUser(
        meeting.getHostUserId(),
        wasApproved ? "meetingParticipantCancelled" : "meetingRequestCancelled",
        wasApproved ? "모임 참가자가 참가를 취소했습니다" : "모임 신청자가 신청을 취소했습니다",
        nickname + "님이 '" + meeting.getTitle() + "' 모임 "
            + (wasApproved ? "참가를 취소했습니다." : "신청을 취소했습니다."),
        "meeting:" + meetingId);
  }

  @Transactional
  public void cancelApproval(Long participantId) {
    Long meetingId = participantDao.selectMeetingIdByParticipantId(participantId);
    if (meetingId != null) {
      MeetingDetailResponse meeting = meetingDao.selectMeetingDetail(meetingId);
      
      // [수정 - 2026-06-01] 이미 진행중(ONGOING), 완료(COMPLETED), 취소(CANCELLED)된 모임의 참가자는 취소 조작 차단 (API 보안 가드)
      if (meeting != null && Arrays.asList("ONGOING", "COMPLETED", "CANCELLED").contains(meeting.getStatus())) {
        throw new IllegalArgumentException("이미 진행중이거나 종료/취소된 모임의 참가자는 상태를 변경할 수 없습니다.");
      }
      
      ParticipantResponse participant = participantDao.selectParticipant(participantId);
      participantDao.updateStatus(participantId, "PENDING");
      if (meeting != null && participant != null) {
        notificationService.sendToUser(
            participant.getUserId(),
            "meetingApprovalCancelled",
            "모임 승인이 취소되었습니다",
            "'" + meeting.getTitle() + "' 모임 승인이 취소되었습니다.",
            "meeting:" + meetingId);
      }
    } else {
      participantDao.updateStatus(participantId, "PENDING");
    }
  }


}
