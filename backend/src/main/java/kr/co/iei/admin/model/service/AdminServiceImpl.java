package kr.co.iei.admin.model.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import kr.co.iei.admin.model.dao.AdminDao;
import kr.co.iei.admin.model.vo.*;
import kr.co.iei.auth.model.service.AuthService;
import kr.co.iei.notification.model.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {
  private final AdminDao adminDao;
  private final AuthService authService;
  private final NotificationService notificationService;

  private void notifyHostedMeetingCancellations(List<Map<String, Object>> targets) {
    if (targets == null || targets.isEmpty()) {
      return;
    }

    for (Map<String, Object> target : targets) {
      Long participantUserId = toLong(target.get("userId"));
      Long meetingId = toLong(target.get("meetingId"));
      String meetingTitle = String.valueOf(target.getOrDefault("meetingTitle", "모임"));

      if (participantUserId == null) {
        continue;
      }

      notificationService.sendToUser(
          participantUserId,
          "meetingCancelled",
          "모임 취소 안내",
          "'" + meetingTitle + "' 모임은 모임장 계정 제재로 취소되었습니다.",
          meetingId == null ? null : "meeting:" + meetingId);
    }
  }

  private Long toLong(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    if (value == null) {
      return null;
    }
    try {
      return Long.valueOf(String.valueOf(value));
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  public AdminSummary getSummary() {
    return adminDao.selectSummary();
  }

  public List<AdminMemberResponse> getMembers() {
    return adminDao.selectMembers();
  }

  public List<AdminRegionResponse> getRegions() {
    return adminDao.selectRegions();
  }

  public List<AdminMeetingResponse> getMeetings() {
    return adminDao.selectMeetings();
  }

  public List<AdminReportResponse> getReports() {
    return adminDao.selectReports();
  }

  public void updateMemberStatus(Long userId, String status) {
    adminDao.updateMemberStatus(userId, status);
  }

  public void updateMeetingStatus(Long meetingId, String status) {
    adminDao.updateMeetingStatus(meetingId, status);
  }

  @Override
  @Transactional
  public void processReport(Long reportId, AdminReportActionRequest request) {
    if (request == null || request.getActionType() == null || request.getActionType().isBlank()) {
      throw new IllegalArgumentException("처리 방법을 선택해주세요.");
    }

    String actionType = request.getActionType().trim().toUpperCase();
    Integer reporterId = adminDao.selectReportReporterId(reportId);

    String reportStatus = "REJECT".equals(actionType) ? "REJECTED" : "RESOLVED";
    adminDao.updateReportStatusToProcessed(reportId, reportStatus);

    if ("REJECT".equals(actionType)) {
      notifyReportResult(reporterId, reportId, "신고가 반려되었습니다.");
      return;
    }

    if (request.getMessage() == null || request.getMessage().isBlank()) {
      throw new IllegalArgumentException("유저에게 보낼 안내 메시지를 입력해주세요.");
    }

    Integer targetUserId = request.getTargetUserId();
    if (targetUserId == null) {
      targetUserId = adminDao.selectReportTargetUserId(reportId);
    }

    if (targetUserId == null) {
      throw new IllegalArgumentException("신고 대상 회원을 확인할 수 없습니다.");
    }

    long userId = targetUserId.longValue();
    String reason = request.getMessage().trim();
    String sourceId = "report:" + reportId;

    if ("WARNING".equals(actionType)) {
      notificationService.sendAccountWarning(userId, reason, sourceId);
      notifyReportResult(reporterId, reportId, "신고가 처리되었습니다.");
      return;
    }

    if ("SUSPEND".equals(actionType)) {
      if (request.getSuspendDuration() <= 0) {
        throw new IllegalArgumentException("정지 기간을 선택해주세요.");
      }

      int suspendHours = request.getSuspendDuration();
      LocalDateTime suspendedUntil =
          AccountSanctionMessageUtil.calculateSuspendedUntil(suspendHours);
      List<Map<String, Object>> hostedMeetingCancelTargets =
          adminDao.selectHostedMeetingCancelNotificationTargets(userId);

      adminDao.suspendUser(userId, suspendHours, reason);
      adminDao.cancelParticipationsByUser(userId);
      adminDao.cancelMeetingsHostedByUser(userId);

      Runnable afterCommit =
          () -> {
            notificationService.sendAccountSuspend(
                userId, reason, suspendHours, suspendedUntil, sourceId);
            notifyReportResult(reporterId, reportId, "신고가 처리되었습니다.");
            notifyHostedMeetingCancellations(hostedMeetingCancelTargets);
            authService.invalidateUserSession(userId);
          };

      if (TransactionSynchronizationManager.isSynchronizationActive()) {
        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
              @Override
              public void afterCommit() {
                afterCommit.run();
              }
            });
      } else {
        afterCommit.run();
      }
      return;
    }

    throw new IllegalArgumentException("지원하지 않는 처리 방법입니다.");
  }

  private void notifyReportResult(Integer reporterId, Long reportId, String message) {
    if (reporterId == null) {
      return;
    }

    notificationService.sendToUser(
        reporterId.longValue(),
        "reportResult",
        "신고 처리 결과",
        message,
        "report:" + reportId);
  }
}
