package kr.co.iei.review.model.service;

import java.util.List;
import kr.co.iei.review.model.dao.ReviewDao;
import kr.co.iei.review.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {
  private final ReviewDao reviewDao;

  public List<ReviewResponse> getReviews(Long meetingId) {
    return reviewDao.selectReviews(meetingId);
  }

  public void createReview(Long meetingId, ReviewRequest req) {
    Review r = new Review();
    r.setMeetingId(meetingId);
    r.setWriterId(req.getWriterId());
    r.setRating(req.getRating());
    r.setContent(req.getContent());
    reviewDao.insertReview(r);
  }
}
