package kr.co.iei.sport.model.vo;

import lombok.Data;

@Data
public class Sport {
  private Long sportId;
  private String name;
  private String category;
  private Boolean isActive;
}
