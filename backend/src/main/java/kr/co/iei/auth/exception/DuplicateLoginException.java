package kr.co.iei.auth.exception;

public class DuplicateLoginException extends RuntimeException {
  public DuplicateLoginException(String message) {
    super(message);
  }
}
