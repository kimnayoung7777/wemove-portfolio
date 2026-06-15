package kr.co.iei.common.exception;

import java.util.Map;
import kr.co.iei.member.model.exception.MemberWithdrawBlockedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(DuplicateResourceException.class)
  public ResponseEntity<ApiErrorResponse> handleDuplicateResource(
          DuplicateResourceException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ApiErrorResponse(exception.getMessage()));
  }

  // 💡 이 부분이 수정되었습니다!
  @ExceptionHandler(AccountSuspendedException.class)
  public ResponseEntity<?> handleAccountSuspended(
          AccountSuspendedException exception) {

    // ApiErrorResponse 대신 Map을 사용하여 프론트엔드가 필요한 모든 정지 정보를 담아 보냅니다.
    return ResponseEntity.status(HttpStatus.LOCKED) // 423 LOCKED
            .body(Map.of(
                    "code", "ACCOUNT_SUSPENDED",
                    "message", exception.getMessage(),
                    "reason", exception.getReason() != null ? exception.getReason() : "운영원칙 위반",
                    "suspendedUntil", exception.getSuspendedUntil() != null ? exception.getSuspendedUntil() : "관리자 문의 요망"
            ));
  }

  @ExceptionHandler(MemberWithdrawBlockedException.class)
  public ResponseEntity<?> handleMemberWithdrawBlocked(
          MemberWithdrawBlockedException exception) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of(
                    "code", exception.getCode(),
                    "message", exception.getMessage(),
                    "meetings", exception.getMeetings()
            ));
  }

  @ExceptionHandler({
          IllegalArgumentException.class,
          MethodArgumentNotValidException.class
  })
  public ResponseEntity<ApiErrorResponse> handleBadRequest(Exception exception) {
    return ResponseEntity.badRequest().body(new ApiErrorResponse(exception.getMessage()));
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException exception) {
    return ResponseEntity.status(exception.getStatusCode())
            .body(new ApiErrorResponse(exception.getReason()));
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
          HttpRequestMethodNotSupportedException exception) {
    return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
            .body(new ApiErrorResponse(exception.getMessage()));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception exception) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ApiErrorResponse(exception.getMessage()));
  }
}
