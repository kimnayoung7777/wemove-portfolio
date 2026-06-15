package kr.co.iei.participant.controller;

import java.util.*;
import kr.co.iei.participant.model.service.ParticipantService;
import kr.co.iei.participant.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ParticipantController {
  private final ParticipantService participantService;

  @PostMapping("/api/meetings/{meetingId}/participants")
  public ResponseEntity<Void> apply(
      @PathVariable Long meetingId, @RequestBody ParticipantRequest req) {
    participantService.apply(meetingId, req);
    return ResponseEntity.ok().build();
  }

  @GetMapping("/api/meetings/{meetingId}/participants")
  public ResponseEntity<List<ParticipantResponse>> list(@PathVariable Long meetingId) {
    return ResponseEntity.ok(participantService.getParticipants(meetingId));
  }

  @PatchMapping("/api/participants/{participantId}/approve")
  public ResponseEntity<Void> approve(@PathVariable Long participantId) {
    participantService.approve(participantId);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/api/participants/{participantId}/reject")
  public ResponseEntity<Void> reject(@PathVariable Long participantId) {
    participantService.reject(participantId);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/api/participants/{participantId}/cancel")
  public ResponseEntity<Void> cancel(@PathVariable Long participantId) {
    participantService.cancel(participantId);
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/api/participants/{participantId}/cancel-approval")
  public ResponseEntity<Void> cancelApproval(@PathVariable Long participantId) {
    participantService.cancelApproval(participantId);
    return ResponseEntity.ok().build();
  }
}
