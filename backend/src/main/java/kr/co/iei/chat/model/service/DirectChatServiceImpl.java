package kr.co.iei.chat.model.service;

import kr.co.iei.chat.model.dao.DirectChatDao;
import kr.co.iei.chat.model.vo.*;
import kr.co.iei.chat.websocket.DirectChatBroadcaster;
import kr.co.iei.notification.model.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DirectChatServiceImpl implements DirectChatService {
  private static final int MESSAGE_LIMIT = 100;
  private static final int MAX_CONTENT_LENGTH = 1000;
  private static final String WEMOVE_STICKER_PREFIX = "::wemove-sticker:";
  private static final String WEMOVE_STICKER_SUFFIX = "::";

  private final DirectChatDao directChatDao;
  private final DirectChatBroadcaster directChatBroadcaster;
  private final NotificationService notificationService;

  @Override
  public List<DirectChatRoomResponse> getRooms(Long userId) {
    if (userId == null) {
      throw new IllegalArgumentException("로그인이 필요합니다.");
    }
    return directChatDao.selectRooms(userId);
  }

  @Override
  @Transactional
  public DirectChatRoomResponse createRoom(Long userId, DirectChatRoomCreateRequest request) {
    Long targetUserId = request == null ? null : request.getTargetUserId();

    if (userId == null) {
      throw new IllegalArgumentException("로그인이 필요합니다.");
    }
    if (targetUserId == null) {
      throw new IllegalArgumentException("대화 상대를 선택해주세요.");
    }
    if (userId.equals(targetUserId)) {
      throw new IllegalArgumentException("자기 자신에게는 1대1 대화를 보낼 수 없습니다.");
    }

    Long existingRoomId = directChatDao.selectExistingRoomId(userId, targetUserId);
    if (existingRoomId != null) {
      directChatDao.reactivateRoom(existingRoomId);
      return directChatDao.selectRoom(existingRoomId, userId);
    }

    if (!directChatDao.canAccessDirectChat(userId, targetUserId)) {
      throw new ResponseStatusException(
              HttpStatus.FORBIDDEN,
              "같은 모임의 참가자에게만 개인 메시지를 보낼 수 있습니다."
      );
    }

    DirectChatRoom room = new DirectChatRoom();
    directChatDao.insertRoom(room);

    directChatDao.insertParticipant(room.getRoomId(), userId);
    directChatDao.insertParticipant(room.getRoomId(), targetUserId);

    return directChatDao.selectRoom(room.getRoomId(), userId);
  }

  @Override
  public List<DirectChatMessageResponse> getMessages(Long roomId, Long userId) {
    assertCanAccess(roomId, userId);
    return directChatDao.selectMessages(roomId, userId, MESSAGE_LIMIT);
  }

  @Override
  @Transactional
  public DirectChatMessageResponse createMessage(
          Long roomId, Long userId, ChatMessageRequest request) {
    assertCanAccess(roomId, userId);
    directChatDao.reactivateRoom(roomId);

    String content = request == null ? "" : normalizeContent(request.getContent());
    if (content.isBlank()) {
      throw new IllegalArgumentException("메시지를 입력해주세요.");
    }
    if (content.length() > MAX_CONTENT_LENGTH) {
      throw new IllegalArgumentException("메시지는 1000자 이하로 입력해주세요.");
    }

    DirectChatMessage message = new DirectChatMessage();
    message.setRoomId(roomId);
    message.setUserId(userId);
    message.setContent(content);
    message.setMessageType("TEXT");

    directChatDao.insertMessage(message);

    DirectChatMessageResponse savedMessage =
            directChatDao.selectMessage(message.getMessageId());

    directChatBroadcaster.broadcast(
            roomId,
            new ChatMessageEvent("DIRECT_CHAT_MESSAGE_CREATED", savedMessage)
    );
    sendMessageNotifications(roomId, userId, savedMessage);

    return savedMessage;
  }

  @Override
  @Transactional
  public void leaveRoom(Long roomId, Long userId) {
    if (roomId == null || userId == null) {
      throw new IllegalArgumentException("나갈 채팅방 정보가 없습니다.");
    }

    int updated = directChatDao.leaveRoom(roomId, userId);
    if (updated <= 0) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "참여 중인 1:1 대화방만 나갈 수 있습니다.");
    }
    directChatDao.deactivateRoomIfEmpty(roomId);
  }

  @Override
  public boolean canAccess(Long roomId, Long userId) {
    if (roomId == null || userId == null) {
      return false;
    }
    return directChatDao.canAccessRoom(roomId, userId);
  }

  private void assertCanAccess(Long roomId, Long userId) {
    if (!canAccess(roomId, userId)) {
      throw new ResponseStatusException(
              HttpStatus.FORBIDDEN,
              "참여 중인 1대1 대화방만 사용할 수 있습니다."
      );
    }
  }

  private String normalizeContent(String content) {
    return String.valueOf(content == null ? "" : content).trim();
  }

  private void sendMessageNotifications(
          Long roomId, Long senderUserId, DirectChatMessageResponse message) {
    if (roomId == null || senderUserId == null || message == null) {
      return;
    }

    String senderName =
            message.getNickname() == null || message.getNickname().isBlank()
                    ? "상대방"
                    : message.getNickname();
    String title = senderName + "님의 메시지";
    String notificationMessage = summarizeContent(message.getContent());

    for (Long targetUserId : directChatDao.selectNotificationTargetUserIds(roomId, senderUserId)) {
      notificationService.sendToUser(
              targetUserId, "chat", title, notificationMessage, "directChat:" + roomId);
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
