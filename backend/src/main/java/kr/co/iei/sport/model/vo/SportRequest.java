package kr.co.iei.sport.model.vo;

import lombok.Data;

@Data
public class SportRequest {
  private String name;
  private String category;
  private Boolean isActive;
}
