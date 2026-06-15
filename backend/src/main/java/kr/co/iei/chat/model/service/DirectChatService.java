package kr.co.iei.chat.model.service;

import java.util.List;
import kr.co.iei.chat.model.vo.ChatMessageRequest;
import kr.co.iei.chat.model.vo.DirectChatMessageResponse;
import kr.co.iei.chat.model.vo.DirectChatRoomCreateRequest;
import kr.co.iei.chat.model.vo.DirectChatRoomResponse;


public interface DirectChatService {

    List<DirectChatRoomResponse> getRooms(Long userId);

    DirectChatRoomResponse createRoom(Long userId, DirectChatRoomCreateRequest request);

    List<DirectChatMessageResponse> getMessages(Long roomId, Long userId);

    DirectChatMessageResponse createMessage(Long roomId, Long userId, ChatMessageRequest request);

    void leaveRoom(Long roomId, Long userId);

    boolean canAccess(Long roomId, Long userId);
}

