package kr.co.iei.comment.model.service;

import java.util.List;
import kr.co.iei.comment.model.vo.*;

public interface CommentService {
  List<CommentResponse> getComments(Long meetingId);

  void createComment(Long meetingId, CommentRequest request);


    void deleteComment(Long commentId, Long requestId);

}
