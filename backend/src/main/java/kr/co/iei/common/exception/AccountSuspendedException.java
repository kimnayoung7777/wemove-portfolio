package kr.co.iei.common.exception;

import lombok.Getter;

@Getter
public class AccountSuspendedException extends RuntimeException {
  private final String reason;
  private final String suspendedUntil;

  // 💡 이제 사유(reason)와 일시(suspendedUntil)를 파라미터로 받는 생성자가 생겼습니다.
  public AccountSuspendedException(String reason, String suspendedUntil) {
    super("Account is suspended");
    this.reason = reason;
    this.suspendedUntil = suspendedUntil;
  }
}