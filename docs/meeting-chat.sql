CREATE TABLE meetingChatMessages (
  messageId BIGINT NOT NULL AUTO_INCREMENT,
  meetingId BIGINT NOT NULL,
  userId BIGINT NOT NULL,
  content VARCHAR(1000) NOT NULL,
  messageType ENUM('TEXT', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (messageId),
  KEY idx_meeting_chat_messages_meeting_created (meetingId, createdAt),
  KEY idx_meeting_chat_messages_user (userId),
  CONSTRAINT fk_meeting_chat_messages_meeting
    FOREIGN KEY (meetingId) REFERENCES meetings(meetingId),
  CONSTRAINT fk_meeting_chat_messages_user
    FOREIGN KEY (userId) REFERENCES users(userId)
);
