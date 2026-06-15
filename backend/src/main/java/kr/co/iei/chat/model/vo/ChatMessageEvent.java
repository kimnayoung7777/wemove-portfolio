package kr.co.iei.chat.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChatMessageEvent {
  private String type;
  private Object message;
}
