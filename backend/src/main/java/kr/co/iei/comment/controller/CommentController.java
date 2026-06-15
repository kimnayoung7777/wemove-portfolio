package kr.co.iei.comment.controller;

import java.util.List;
import kr.co.iei.comment.model.service.CommentService;
import kr.co.iei.comment.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CommentController {
  private final CommentService commentService;

  @GetMapping("/api/meetings/{meetingId}/comments")
  public ResponseEntity<List<CommentResponse>> list(@PathVariable Long meetingId) {
    return ResponseEntity.ok(commentService.getComments(meetingId));
  }

  @PostMapping("/api/meetings/{meetingId}/comments")
  public ResponseEntity<Void> create(
      @PathVariable Long meetingId, @RequestBody CommentRequest req) {
    commentService.createComment(meetingId, req);
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/api/comments/{commentId}")
  public ResponseEntity<Void> delete(@PathVariable Long commentId, @RequestParam Long requestId) {
    System.out.println("🛸 [Controller 도착] URL의 commentId: " + commentId);
    System.out.println("🛸 [Controller 도착] 쿼리스트링 requestId: " + requestId);
    commentService.deleteComment(commentId, requestId);
    return ResponseEntity.ok().build();
  }
}
