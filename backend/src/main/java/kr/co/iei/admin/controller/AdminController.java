package kr.co.iei.admin.controller;

import java.util.List;
import kr.co.iei.admin.model.service.AdminService;
import kr.co.iei.admin.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
  private final AdminService adminService;

  @GetMapping("/summary")
  public ResponseEntity<AdminSummary> summary() {
    return ResponseEntity.ok(adminService.getSummary());
  }

  @GetMapping("/members")
  public ResponseEntity<List<AdminMemberResponse>> members() {
    return ResponseEntity.ok(adminService.getMembers());
  }

  @GetMapping("/regions")
  public ResponseEntity<List<AdminRegionResponse>> regions() {
    return ResponseEntity.ok(adminService.getRegions());
  }

  @GetMapping("/meetings")
  public ResponseEntity<List<AdminMeetingResponse>> meetings() {
    return ResponseEntity.ok(adminService.getMeetings());
  }

  @GetMapping("/reports")
  public ResponseEntity<List<AdminReportResponse>> reports() {
    return ResponseEntity.ok(adminService.getReports());
  }

  @PatchMapping("/members/{userId}/status")
  public ResponseEntity<Void> updateMemberStatus(
      @PathVariable Long userId, @RequestBody AdminStatusUpdateRequest request) {
    adminService.updateMemberStatus(userId, request.getStatus());
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/meetings/{meetingId}/status")
  public ResponseEntity<Void> updateMeetingStatus(
      @PathVariable Long meetingId, @RequestBody AdminStatusUpdateRequest request) {
    adminService.updateMeetingStatus(meetingId, request.getStatus());
    return ResponseEntity.ok().build();
  }


  @PostMapping("/reports/{reportId}/process")
  public ResponseEntity<?> processReport(
          @PathVariable("reportId") int reportId,
          @RequestBody AdminReportActionRequest request) {

    adminService.processReport((long) reportId, request);
    return ResponseEntity.ok().build();
  }
}
