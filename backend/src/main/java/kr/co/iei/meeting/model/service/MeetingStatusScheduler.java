package kr.co.iei.meeting.model.service;

import java.util.List;
import java.util.Map;
import kr.co.iei.chat.model.service.ChatService;
import kr.co.iei.meeting.model.dao.MeetingDao;
import kr.co.iei.notification.model.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeetingStatusScheduler {
  private final MeetingDao meetingDao;
  private final ChatService chatService;
  private final NotificationService notificationService;

  @Scheduled(fixedDelay = 60_000)
  @Transactional
  public void updateTimeBasedMeetingStatuses() {
    int startedCount = meetingDao.startDueMeetings();
    if (startedCount > 0) {
      log.info("Auto-started {} meeting(s) whose schedule has passed.", startedCount);
    }

    int completedCount = meetingDao.completeOverdueOngoingMeetings();
    if (completedCount > 0) {
      log.info("Auto-completed {} ongoing meeting(s) older than 24 hours.", completedCount);
    }

    List<Map<String, Object>> closeTargets = meetingDao.selectCompletedChatCloseTargets();
    for (Map<String, Object> target : closeTargets) {
      Long meetingId = toLong(target.get("meetingId"));
      Long hostUserId = toLong(target.get("hostUserId"));
      if (meetingId != null && hostUserId != null) {
        chatService.createSystemMessage(
            meetingId, hostUserId, "모임 완료 후 7일이 지나 모임톡이 비활성화되었습니다.");
      }
    }
  }

  @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
  @Transactional
  public void sendTodayMeetingReminders() {
    List<Map<String, Object>> targets = meetingDao.selectTodayReminderNotificationTargets();
    for (Map<String, Object> target : targets) {
      Long meetingId = toLong(target.get("meetingId"));
      Long userId = toLong(target.get("userId"));
      String meetingTitle = String.valueOf(target.getOrDefault("meetingTitle", "모임"));
      if (meetingId == null || userId == null) {
        continue;
      }

      notificationService.sendToUser(
          userId,
          "meetingReminder",
          "모임 시작 임박",
          "오늘 '" + meetingTitle + "' 모임이 예정되어 있습니다.",
          "meeting:" + meetingId);
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
}
