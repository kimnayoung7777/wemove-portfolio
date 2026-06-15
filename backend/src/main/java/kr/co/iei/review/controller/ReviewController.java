package kr.co.iei.review.controller;

import java.util.List;
import kr.co.iei.review.model.service.ReviewService;
import kr.co.iei.review.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ReviewController {
  private final ReviewService reviewService;

  @GetMapping("/api/meetings/{meetingId}/reviews")
  public ResponseEntity<List<ReviewResponse>> list(@PathVariable Long meetingId) {
    return ResponseEntity.ok(reviewService.getReviews(meetingId));
  }

  @PostMapping("/api/meetings/{meetingId}/reviews")
  public ResponseEntity<Void> create(@PathVariable Long meetingId, @RequestBody ReviewRequest req) {
    reviewService.createReview(meetingId, req);
    return ResponseEntity.ok().build();
  }
}
