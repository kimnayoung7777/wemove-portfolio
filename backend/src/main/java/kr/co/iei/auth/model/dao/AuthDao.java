package kr.co.iei.auth.model.dao;

import java.time.LocalDateTime;
import java.util.Map;
import kr.co.iei.member.model.vo.Member;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AuthDao {
  private final SqlSession sqlSession;

  public Member selectByLoginId(String loginId) {
    return sqlSession.selectOne("auth.selectByLoginId", loginId);
  }

  public Member selectByUserId(Long userId) {
    return sqlSession.selectOne("auth.selectByUserId", userId);
  }

  public Member selectByEmail(String email) {
    return sqlSession.selectOne("auth.selectByEmail", email);
  }

  public Member selectByNickname(String nickname) {
    return sqlSession.selectOne("auth.selectByNickname", nickname);
  }

  public int insertMember(Member member) {
    return sqlSession.insert("auth.insertMember", member);
  }

  public int insertUserSport(Long userId, Long sportId) {
    return sqlSession.insert("auth.insertUserSport", Map.of("userId", userId, "sportId", sportId));
  }

  public int updatePassword(Long userId, String password) {
    return sqlSession.update("auth.updatePassword", Map.of("userId", userId, "password", password));
  }

  public int updateMemberStatus(Long userId, String status) {
    return sqlSession.update("auth.updateMemberStatus", Map.of("userId", userId, "status", status));
  }

  public int restoreExpiredSuspensions() {
    return sqlSession.update("auth.restoreExpiredSuspensions");
  }

  public int suspendUser(Long userId, LocalDateTime suspendedUntil) {
    return sqlSession.update(
        "auth.suspendUser",
        Map.of("userId", userId, "suspendedUntil", suspendedUntil));
  }
}
