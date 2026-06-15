package kr.co.iei.chat.model.service;

import java.util.List;
import kr.co.iei.chat.model.vo.ChatMessageRequest;
import kr.co.iei.chat.model.vo.ChatMessageResponse;
import kr.co.iei.chat.model.vo.ChatRoomResponse;

public interface ChatService {
  List<ChatRoomResponse> getRooms(Long userId);

  List<ChatMessageResponse> getMessages(Long meetingId, Long userId);

  ChatMessageResponse createMessage(Long meetingId, Long userId, ChatMessageRequest request);

  ChatMessageResponse createSystemMessage(Long meetingId, Long userId, String content);

  void leaveRoom(Long meetingId, Long userId);

  boolean canAccess(Long meetingId, Long userId);
}
