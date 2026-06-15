package kr.co.iei.chat.model.service;

import java.util.List;
import kr.co.iei.chat.model.dao.ChatDao;
import kr.co.iei.chat.model.vo.ChatMessage;
import kr.co.iei.chat.model.vo.ChatMessageEvent;
import kr.co.iei.chat.model.vo.ChatMessageRequest;
import kr.co.iei.chat.model.vo.ChatMessageResponse;
import kr.co.iei.chat.model.vo.ChatRoomResponse;
import kr.co.iei.chat.websocket.MeetingChatBroadcaster;
import kr.co.iei.notification.model.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
  private static final int MESSAGE_LIMIT = 100;
  private static final int MAX_CONTENT_LENGTH = 1000;
  private static final String WEMOVE_STICKER_PREFIX = "::wemove-sticker:";
  private static final String WEMOVE_STICKER_SUFFIX = "::";

  private final ChatDao chatDao;
  private final MeetingChatBroadcaster meetingChatBroadcaster;
  private final NotificationService notificationService;

  @Override
  public List<ChatRoomResponse> getRooms(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("로그인이 필요합니다.");
    }
    return chatDao.selectChatRooms(userId);
  }

  @Override
  public List<ChatMessageResponse> getMessages(Long meetingId, Long userId) {
    assertCanAccess(meetingId, userId);
    return chatDao.selectMessages(meetingId, userId, MESSAGE_LIMIT);
  }

  @Override
  @Transactional
  public ChatMessageResponse createMessage(
      Long meetingId, Long userId, ChatMessageRequest request) {
    assertCanAccess(meetingId, userId);
    if (!chatDao.isMeetingChatWritable(meetingId)) {
      throw new ResponseStatusException(HttpStatus.GONE, "비활성화된 모임톡입니다.");
    }

    String content = request == null ? "" : normalizeContent(request.getContent());
    if (content.isBlank()) {
      throw new IllegalArgumentException("메시지를 입력해주세요.");
    }
    if (content.length() > MAX_CONTENT_LENGTH) {
      throw new IllegalArgumentException("메시지는 1000자 이하로 입력해주세요.");
    }

    ChatMessage message = new ChatMessage();
    message.setMeetingId(meetingId);
    message.setUserId(userId);
    message.setContent(content);
    message.setMessageType("TEXT");
    chatDao.insertMessage(message);

    ChatMessageResponse savedMessage = chatDao.selectMessage(message.getMessageId());
    meetingChatBroadcaster.broadcast(
        meetingId, new ChatMessageEvent("CHAT_MESSAGE_CREATED", savedMessage));
    sendMessageNotifications(meetingId, userId, savedMessage);
    return savedMessage;
  }

  @Override
  @Transactional
  public ChatMessageResponse createSystemMessage(Long meetingId, Long userId, String content) {
    if (meetingId == null || userId == null) {
      throw new IllegalArgumentException("시스템 메시지를 보낼 모임 정보가 없습니다.");
    }

    String normalizedContent = normalizeContent(content);
    if (normalizedContent.isBlank()) {
      return null;
    }

    ChatMessage message = new ChatMessage();
    message.setMeetingId(meetingId);
    message.setUserId(userId);
    message.setContent(normalizedContent);
    message.setMessageType("SYSTEM");
    chatDao.insertMessage(message);

    ChatMessageResponse savedMessage = chatDao.selectMessage(message.getMessageId());
    meetingChatBroadcaster.broadcast(
        meetingId, new ChatMessageEvent("CHAT_MESSAGE_CREATED", savedMessage));
    return savedMessage;
  }

  @Override
  @Transactional
  public void leaveRoom(Long meetingId, Long userId) {
    if (meetingId == null || userId == null) {
      throw new IllegalArgumentException("나갈 채팅방 정보가 없습니다.");
    }

    int updated = chatDao.leaveRoom(meetingId, userId);
    if (updated <= 0) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "참가 중인 모임톡만 나갈 수 있습니다.");
    }
  }

  @Override
  public boolean canAccess(Long meetingId, Long userId) {
    if (meetingId == null || userId == null) {
      return false;
    }
    return chatDao.canAccessMeetingChat(meetingId, userId);
  }

  private void assertCanAccess(Long meetingId, Long userId) {
    if (!canAccess(meetingId, userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "승인된 모임 참가자만 단톡방을 사용할 수 있습니다.");
    }
  }

  private String normalizeContent(String content) {
    return String.valueOf(content == null ? "" : content).trim();
  }

  private void sendMessageNotifications(
      Long meetingId, Long senderUserId, ChatMessageResponse message) {
    if (meetingId == null || senderUserId == null || message == null) {
      return;
    }

    String meetingTitle = chatDao.selectMeetingTitle(meetingId);
    String title =
        meetingTitle == null || meetingTitle.isBlank() ? "무브톡 새 메시지" : meetingTitle;
    String senderName =
        message.getNickname() == null || message.getNickname().isBlank()
            ? "참가자"
            : message.getNickname();
    String notificationMessage = senderName + ": " + summarizeContent(message.getContent());

    for (Long targetUserId : chatDao.selectNotificationTargetUserIds(meetingId, senderUserId)) {
      notificationService.sendToUser(
          targetUserId, "chat", title, notificationMessage, "meetingChat:" + meetingId);
    }
  }

  private String summarizeContent(String content) {
    String normalized = normalizeContent(content);
    if (isStickerContent(normalized)) {
      return "이모티콘을 보냈습니다.";
    }
    if (normalized.isBlank()) {
      return "새 메시지가 도착했습니다.";
    }
    return normalized.length() > 80 ? normalized.substring(0, 80) + "..." : normalized;
  }

  private boolean isStickerContent(String content) {
    return content != null
        && content.startsWith(WEMOVE_STICKER_PREFIX)
        && content.endsWith(WEMOVE_STICKER_SUFFIX);
  }
}
