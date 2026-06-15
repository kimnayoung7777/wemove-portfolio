package kr.co.iei.review.model.service;

import java.util.List;
import kr.co.iei.review.model.vo.*;

public interface ReviewService {
  List<ReviewResponse> getReviews(Long meetingId);

  void createReview(Long meetingId, ReviewRequest request);
}
