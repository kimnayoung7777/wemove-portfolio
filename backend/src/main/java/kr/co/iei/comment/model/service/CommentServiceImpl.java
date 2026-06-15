package kr.co.iei.comment.model.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import kr.co.iei.comment.model.dao.CommentDao;
import kr.co.iei.comment.model.vo.*;
import kr.co.iei.meeting.model.dao.MeetingDao;
import kr.co.iei.meeting.model.vo.Meeting;
import kr.co.iei.meeting.model.vo.MeetingDetailResponse;
import kr.co.iei.notification.model.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {
  private final CommentDao commentDao;
  private final MeetingDao meetingDao;
  private final NotificationService notificationService;

  public List<CommentResponse> getComments(Long meetingId) {
    return commentDao.selectComments(meetingId);
  }

  @Transactional
  public void createComment(Long meetingId, CommentRequest req) {
    Comment c = new Comment();
    c.setMeetingId(meetingId);
    c.setWriterId(req.getWriterId());
    c.setParentCommentId(req.getParentCommentId());
    c.setContent(req.getContent());
    commentDao.insertComment(c);

    MeetingDetailResponse meeting = meetingDao.selectMeetingDetail(meetingId);
    Long hostUserId = meeting == null ? null : meeting.getHostUserId();
    if (hostUserId != null && !Objects.equals(hostUserId, req.getWriterId())) {
      notificationService.sendToUser(
          hostUserId,
          "comment",
          "새 댓글이 작성되었습니다",
          "'" + meeting.getTitle() + "' 모임에 댓글이 작성되었습니다.",
          "meeting:" + meetingId);
    }
  }

  @Override
  @Transactional
  public void deleteComment(Long commentId, Long requestId) {
    //1. 댓글 정보
    Comment comment = commentDao.selectCommentById(commentId);

    if (comment == null) {
      throw new IllegalArgumentException("존재하지 않는 댓글입니다.");
    }
    // 2. 모임 정보 가져오기 (주최자 확인)
    Long hostUserId = meetingDao.selectHostUserId(comment.getMeetingId());
    if (hostUserId == null) {
      throw new IllegalArgumentException("존재하지 않는 모임입니다.");
    }
    // 3. 권한 체크 (작성자이거나 모임 주최자인지 확인)
    boolean isWriter = comment.getWriterId().equals(requestId);
    boolean isHost = hostUserId.equals(requestId);

    if (!isWriter && !isHost) {
      throw new SecurityException("댓글을 삭제할 권한이 없습니다.");
    }
    //본인: 1, 주최자:2
    int deleteStatus = isWriter ? 1 : 2;

    Map<String, Object> params = new HashMap<>();
    params.put("commentId", commentId);
    params.put("isDeleted", deleteStatus);

    commentDao.softDeleteComment(params);
  }




}
