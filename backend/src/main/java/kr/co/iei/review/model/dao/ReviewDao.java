package kr.co.iei.review.model.dao;

import java.util.List;
import kr.co.iei.review.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ReviewDao {
  private final SqlSession sqlSession;

  public List<ReviewResponse> selectReviews(Long meetingId) {
    return sqlSession.selectList("review.selectReviews", meetingId);
  }

  public int insertReview(Review r) {
    return sqlSession.insert("review.insertReview", r);
  }
}
