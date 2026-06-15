package kr.co.iei.stats.controller;

import kr.co.iei.stats.model.service.StatsService;
import kr.co.iei.stats.model.vo.LoginPageStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {
  private final StatsService statsService;

  @GetMapping("/login-page")
  public ResponseEntity<LoginPageStatsResponse> loginPageStats() {
    return ResponseEntity.ok(statsService.getLoginPageStats());
  }
}
