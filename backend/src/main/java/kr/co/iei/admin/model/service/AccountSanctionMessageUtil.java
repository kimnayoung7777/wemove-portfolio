package kr.co.iei.admin.model.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public final class AccountSanctionMessageUtil {
  private static final DateTimeFormatter UNTIL_FORMAT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  private AccountSanctionMessageUtil() {}

  public static String formatDurationLabel(int hours) {
    if (hours >= 876000) {
      return "영구";
    }
    if (hours >= 24 && hours % 24 == 0) {
      return (hours / 24) + "일";
    }
    return hours + "시간";
  }

  public static LocalDateTime calculateSuspendedUntil(int hours) {
    if (hours >= 876000) {
      return LocalDateTime.now().plusYears(100);
    }
    return LocalDateTime.now().plusHours(hours);
  }

  public static String buildSuspendNotice(String reason, int hours, LocalDateTime until) {
    String duration = formatDurationLabel(hours);
    String untilText = until == null ? "-" : until.format(UNTIL_FORMAT);
    return reason
        + " 사유로 계정이 "
        + duration
        + " 정지되었습니다.\n해제 예정: "
        + untilText
        + "까지";
  }

  public static String buildWarningNotice(String reason) {
    return "관리자 경고: " + reason;
  }

  public static String buildLoginBlockedMessage(String reason, LocalDateTime until) {
    StringBuilder message = new StringBuilder();
    if (reason != null && !reason.isBlank()) {
      message.append(reason.trim()).append(" 사유로 ");
    }
    message.append("계정이 정지되어 로그인할 수 없습니다.");
    if (until != null) {
      message.append("\n해제 예정: ").append(until.format(UNTIL_FORMAT)).append("까지");
    }
    return message.toString();
  }
}
