package kr.co.iei.region.controller;

import java.util.List;
import kr.co.iei.region.model.service.RegionService;
import kr.co.iei.region.model.vo.Region;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class RegionController {
  private final RegionService regionService;

  @GetMapping("/api/regions")
  public ResponseEntity<List<Region>> regions() {
    return ResponseEntity.ok(regionService.getRegions());
  }
}
