package kr.co.iei.chat.controller;

import java.util.List;
import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.chat.model.service.DirectChatService;
import kr.co.iei.chat.model.vo.ChatMessageRequest;
import kr.co.iei.chat.model.vo.DirectChatRoomCreateRequest;
import kr.co.iei.chat.model.vo.DirectChatMessageResponse;
import kr.co.iei.chat.model.vo.DirectChatRoomResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class DirectChatController {
    private final DirectChatService directChatService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/api/direct-chat/rooms")
    public ResponseEntity<List<DirectChatRoomResponse>> rooms(
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
        Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
        return ResponseEntity.ok(directChatService.getRooms(userId));
    }

    @PostMapping("/api/direct-chat/rooms")
    public ResponseEntity<DirectChatRoomResponse> createRoom(
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
            @RequestBody DirectChatRoomCreateRequest request) {
        Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
        return ResponseEntity.ok(directChatService.createRoom(userId, request));
    }

    @GetMapping("/api/direct-chat/rooms/{roomId}/messages")
    public ResponseEntity<List<DirectChatMessageResponse>> directMessages(
            @PathVariable Long roomId,
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
        Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
        return ResponseEntity.ok(directChatService.getMessages(roomId, userId));
    }

    @PostMapping("/api/direct-chat/rooms/{roomId}/messages")
    public ResponseEntity<DirectChatMessageResponse> createDirectMessage(
            @PathVariable Long roomId,
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
            @RequestBody ChatMessageRequest request) {
        Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
        return ResponseEntity.ok(directChatService.createMessage(roomId, userId, request));
    }

    @PatchMapping("/api/direct-chat/rooms/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable Long roomId,
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
        Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
        directChatService.leaveRoom(roomId, userId);
        return ResponseEntity.ok().build();
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("유효한 인증 토큰이 없습니다.");
        }
        return authorizationHeader.substring(7);
    }
}
