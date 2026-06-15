package kr.co.iei.sport.controller;

import java.util.List;
import java.util.Map;
import kr.co.iei.sport.model.service.SportService;
import kr.co.iei.sport.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class SportController {
  private final SportService sportService;

  @GetMapping("/api/sports")
  public ResponseEntity<List<Sport>> sports() {
    return ResponseEntity.ok(sportService.getSports());
  }

  @PostMapping("/api/admin/sports")
  public ResponseEntity<?> create(@RequestBody SportRequest req) {
    try {
      sportService.createSport(req);
      return ResponseEntity.ok().build();
    } catch (IllegalArgumentException exception) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
          .body(Map.of("message", exception.getMessage()));
    }
  }

  @PutMapping("/api/admin/sports/{sportId}")
  public ResponseEntity<?> update(@PathVariable Long sportId, @RequestBody SportRequest req) {
    try {
      sportService.updateSport(sportId, req);
      return ResponseEntity.ok().build();
    } catch (IllegalArgumentException exception) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
          .body(Map.of("message", exception.getMessage()));
    }
  }

  @DeleteMapping("/api/admin/sports/{sportId}")
  public ResponseEntity<Void> delete(@PathVariable Long sportId) {
    sportService.deleteSport(sportId);
    return ResponseEntity.ok().build();
  }
}
