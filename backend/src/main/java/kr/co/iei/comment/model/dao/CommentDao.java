package kr.co.iei.comment.model.dao;

import java.util.List;
import java.util.Map;

import kr.co.iei.comment.model.vo.*;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CommentDao {
  private final SqlSession sqlSession;

  public List<CommentResponse> selectComments(Long meetingId) {
    return sqlSession.selectList("comment.selectComments", meetingId);
  }

  public int insertComment(Comment c) {
    return sqlSession.insert("comment.insertComment", c);
  }

  public int softDeleteComment(Map<String, Object> params) {
    return sqlSession.update("comment.softDeleteComment", params);
  }

    public Comment selectCommentById(Long commentId) {
      return sqlSession.selectOne("comment.selectCommentById", commentId);
    }

}
