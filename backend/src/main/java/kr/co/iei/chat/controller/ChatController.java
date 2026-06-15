package kr.co.iei.chat.controller;

import java.util.List;
import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.chat.model.service.ChatService;
import kr.co.iei.chat.model.vo.ChatMessageRequest;
import kr.co.iei.chat.model.vo.ChatMessageResponse;
import kr.co.iei.chat.model.vo.ChatRoomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ChatController {
  private final ChatService chatService;
  private final JwtTokenProvider jwtTokenProvider;

  @GetMapping("/api/chat/rooms")
  public ResponseEntity<List<ChatRoomResponse>> rooms(
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
    return ResponseEntity.ok(chatService.getRooms(userId));
  }

  @GetMapping("/api/meetings/{meetingId}/chat/messages")
  public ResponseEntity<List<ChatMessageResponse>> messages(
      @PathVariable Long meetingId,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
    return ResponseEntity.ok(chatService.getMessages(meetingId, userId));
  }

  @PostMapping("/api/meetings/{meetingId}/chat/messages")
  public ResponseEntity<ChatMessageResponse> createMessage(
      @PathVariable Long meetingId,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
      @RequestBody ChatMessageRequest request) {
    Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
    return ResponseEntity.ok(chatService.createMessage(meetingId, userId, request));
  }

  @PatchMapping("/api/meetings/{meetingId}/chat/leave")
  public ResponseEntity<Void> leaveRoom(
      @PathVariable Long meetingId,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
    chatService.leaveRoom(meetingId, userId);
    return ResponseEntity.ok().build();
  }

  private String extractBearerToken(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      throw new IllegalArgumentException("유효한 인증 토큰이 없습니다.");
    }
    return authorizationHeader.substring(7);
  }
}
