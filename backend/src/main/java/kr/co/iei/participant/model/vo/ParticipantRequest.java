package kr.co.iei.participant.model.vo;

import lombok.Data;

@Data
public class ParticipantRequest {
  private Long userId;
  private String message;
}
