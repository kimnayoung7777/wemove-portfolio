package kr.co.iei.notification.model.dao;

import java.util.List;
import java.util.Map;
import kr.co.iei.notification.model.vo.NotificationRecord;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class NotificationDao {
  private final SqlSession sqlSession;

  public int insertNotification(NotificationRecord notification) {
    return sqlSession.insert("notification.insertNotification", notification);
  }

  public List<NotificationRecord> selectNotifications(Long userId, int limit) {
    return sqlSession.selectList("notification.selectNotifications", Map.of("userId", userId, "limit", limit));
  }

  public List<NotificationRecord> selectNoticeNotifications(Long userId) {
    return sqlSession.selectList("notification.selectNoticeNotifications");
  }

  public int countUnread(Long userId) {
    return sqlSession.selectOne("notification.countUnread", Map.of("userId", userId));
  }

  public int markAllRead(Long userId) {
    return sqlSession.update("notification.markAllRead", Map.of("userId", userId));
  }

  public int deleteNotification(Long userId, Long notificationId) {
    return sqlSession.delete(
        "notification.deleteNotification", Map.of("userId", userId, "notificationId", notificationId));
  }

  public int deleteAll(Long userId) {
    return sqlSession.delete("notification.deleteAll", Map.of("userId", userId));
  }

  public List<Long> selectActiveUserIds() {
    return sqlSession.selectList("notification.selectActiveUserIds");
  }
}
