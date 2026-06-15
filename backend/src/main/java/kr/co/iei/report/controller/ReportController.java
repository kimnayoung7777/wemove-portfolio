package kr.co.iei.report.controller;

import kr.co.iei.report.model.service.ReportService;
import kr.co.iei.report.model.vo.ReportRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ReportController {
  private final ReportService reportService;

  @PostMapping("/api/reports")
  public ResponseEntity<Void> create(@RequestBody ReportRequest req) {
    reportService.createReport(req);
    return ResponseEntity.ok().build();
  }
}
