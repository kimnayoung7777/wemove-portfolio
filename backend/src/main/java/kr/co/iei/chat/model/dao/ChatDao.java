package kr.co.iei.chat.model.dao;

import java.util.List;
import java.util.Map;
import kr.co.iei.chat.model.vo.ChatMessage;
import kr.co.iei.chat.model.vo.ChatMessageResponse;
import kr.co.iei.chat.model.vo.ChatRoomResponse;
import lombok.RequiredArgsConstructor;
import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ChatDao {
  private final SqlSession sqlSession;

  public boolean canAccessMeetingChat(Long meetingId, Long userId) {
    Integer count =
        sqlSession.selectOne(
            "chat.canAccessMeetingChat", Map.of("meetingId", meetingId, "userId", userId));
    return count != null && count > 0;
  }

  public boolean isMeetingChatWritable(Long meetingId) {
    Integer count = sqlSession.selectOne("chat.isMeetingChatWritable", meetingId);
    return count != null && count > 0;
  }

  public List<ChatRoomResponse> selectChatRooms(Long userId) {
    return sqlSession.selectList("chat.selectChatRooms", userId);
  }

  public List<ChatMessageResponse> selectMessages(Long meetingId, Long userId, int limit) {
    return sqlSession.selectList(
        "chat.selectMessages",
        Map.of("meetingId", meetingId, "userId", userId, "limit", limit));
  }

  public int insertMessage(ChatMessage message) {
    return sqlSession.insert("chat.insertMessage", message);
  }

  public ChatMessageResponse selectMessage(Long messageId) {
    return sqlSession.selectOne("chat.selectMessage", messageId);
  }

  public String selectMeetingTitle(Long meetingId) {
    return sqlSession.selectOne("chat.selectMeetingTitle", meetingId);
  }

  public List<Long> selectNotificationTargetUserIds(Long meetingId, Long senderUserId) {
    return sqlSession.selectList(
        "chat.selectNotificationTargetUserIds",
        Map.of("meetingId", meetingId, "senderUserId", senderUserId));
  }

  public int leaveRoom(Long meetingId, Long userId) {
    return sqlSession.update("chat.leaveRoom", Map.of("meetingId", meetingId, "userId", userId));
  }
}
