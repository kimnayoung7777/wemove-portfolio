package kr.co.iei.meeting.controller;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import kr.co.iei.auth.util.JwtTokenProvider;
import kr.co.iei.meeting.model.service.MeetingService;
import kr.co.iei.meeting.model.vo.MeetingCreateRequest;
import kr.co.iei.meeting.model.vo.MeetingDetailResponse;
import kr.co.iei.meeting.model.vo.MeetingListResponse;
import kr.co.iei.meeting.model.vo.MeetingSearchCondition;
import kr.co.iei.meeting.model.vo.MeetingStatusUpdateRequest;
import kr.co.iei.meeting.model.vo.MeetingUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {
  private final MeetingService meetingService;
  private final JwtTokenProvider jwtTokenProvider;

  @GetMapping("/main")
  public ResponseEntity<List<MeetingListResponse>> getMainList(
    @RequestParam(required = false, defaultValue = "전체") String category){
    System.out.println("넘어온 카테고리: "+ category);
    return ResponseEntity.ok(meetingService.getMainMeetingList(category));
  }

  @GetMapping("/popular")
  public ResponseEntity<List<MeetingListResponse>> getPopularList(
      @RequestParam(name = "period", defaultValue = "7d") String period) {
    return ResponseEntity.ok(meetingService.getPopularMeetingList(period));
  }

  @GetMapping
  public ResponseEntity<Map<String, Object>> list(
      MeetingSearchCondition c,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
      try {
        Long loginUserId = jwtTokenProvider.parseUserId(authorizationHeader.substring(7));
        c.setLoginUserId(loginUserId);
      } catch (Exception e) {
        // 토큰 위조/만료 시 무시 (비로그인 처리)
      }
    }
    return ResponseEntity.ok(meetingService.getMeetings(c));
  }

  @GetMapping("/top-regions")
  public ResponseEntity<List<Map<String, Object>>> topRegions() {
    try {
      return ResponseEntity.ok(meetingService.getTopRegions());
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(Collections.emptyList());
    }
  }

  @GetMapping("/{meetingId}")
  public ResponseEntity<MeetingDetailResponse> detail(@PathVariable Long meetingId) {
    return ResponseEntity.ok(meetingService.getMeeting(meetingId));
  }

  @PostMapping("/{meetingId}/views")
  public ResponseEntity<Void> recordView(
      @PathVariable Long meetingId,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader,
      HttpServletRequest request) {
    meetingService.recordMeetingView(meetingId, resolveActorKey(authorizationHeader, request));
    return ResponseEntity.ok().build();
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Map<String, Long>> create(
      @RequestPart("request") MeetingCreateRequest request,
      @RequestPart(value = "image", required = false) MultipartFile image,
      @RequestHeader(name = "Authorization", required = false) String authorizationHeader) {
    Long userId = jwtTokenProvider.parseUserId(extractBearerToken(authorizationHeader));
    Long meetingId = meetingService.createMeeting(request, image, userId);
    return ResponseEntity.ok(Map.of("meetingId", meetingId));
  }

  @PutMapping("/{meetingId}")
  public ResponseEntity<Void> update(
      @PathVariable Long meetingId,
      @RequestPart(value = "request") MeetingUpdateRequest request,
      @RequestPart(value = "image", required = false) MultipartFile image) {
    System.out.println("??而⑦듃濡ㅻ윭?먯꽌 諛쏆? request: " + request);
    meetingService.updateMeeting(meetingId, request, image);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/{meetingId}")
  public ResponseEntity<Void> delete(@PathVariable Long meetingId) {
    meetingService.deleteMeeting(meetingId);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/{meetingId}/status")
  public ResponseEntity<Void> status(
      @PathVariable Long meetingId, @RequestBody MeetingStatusUpdateRequest request) {
    meetingService.updateMeetingStatus(meetingId, request);
    return ResponseEntity.ok().build();
  }

  private String extractBearerToken(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      throw new IllegalArgumentException("?좏슚???몄쬆 ?좏겙???놁뒿?덈떎.");
    }
    return authorizationHeader.substring(7);
  }

  private String resolveActorKey(String authorizationHeader, HttpServletRequest request) {
    if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
      String token = authorizationHeader.substring(7);
      if (jwtTokenProvider.isValid(token)) {
        return "member:" + jwtTokenProvider.parseUserId(token);
      }
    }

    return "session:" + request.getSession(true).getId();
  }
}
