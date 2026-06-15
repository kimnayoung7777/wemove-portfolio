import {useAuth} from "../contexts/AuthContext.jsx";
import styles from "../styles/Comment.module.css";
import {useEffect, useState} from "react";
import {createComment, deleteComment, getComments} from "../api/commentApi.js";
import defaultUserImage from "../assets/image/Default-user.png";
import UiIcon from "../components/UiIcon"; // 💡 UiIcon 컴포넌트 임포트 (경로 확인 필수!)

export default function Comment({meetingId, hostUserId, comments, setComments}) {
    const {user, isAuthenticated} = useAuth();

    const [content, setContent] = useState("");
    const [replyingTo, setReplyingTo] = useState(null); // 답글 폼을 열어둔 부모댓글 ID
    const [replyContent, setReplyContent] = useState("");

    // 1. 댓글 목록 조회
    const fetchComments = () => {
        getComments(meetingId).then((res) => {
            setComments(res.data);
        }).catch((err) => {
            console.error("댓글불러오기 실패: ", err);
        });
    }

    useEffect(() => {
        if (meetingId) {
            fetchComments();
        }
    }, [meetingId]);

    // 2. 부모 댓글 등록
    const handleCommentSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) {
            alert("댓글 내용을 입력해주세요.");
            return;
        }
        const commentData = {
            writerId: user?.memberId,
            content: content,
            parentCommentId: null
        }
        createComment(meetingId, commentData).then((res) => {
            setContent("");
            fetchComments();
        }).catch((err) => {
            console.error(err);
            alert("댓글 등록에 실패했습니다.");
        });
    }

    // 3. 댓글 삭제
    const handleDeleteComment = (commentId) => {
        if (!window.confirm("이 댓글을 삭제하시겠습니까?")) return;
        deleteComment(commentId, user.memberId)
            .then(() => {
                alert("댓글이 삭제되었습니다.");
                fetchComments();
            })
            .catch((err) => {
                console.error("댓글 삭제 실패: ", err);
                alert("삭제 권한이 없거나 오류가 발생했습니다.");
            });
    }

    // 4. 대댓글 등록
    const handleReplySubmit = (e, parentCommentId) => {
        e.preventDefault();

        if (!isAuthenticated) {
            alert("로그인이 필요합니다.");
            return;
        }

        if (!replyContent.trim()) {
            alert("답글 내용을 입력해주세요.");
            return;
        }
        const commentData = {
            writerId: user?.memberId,
            content: replyContent,
            parentCommentId: parentCommentId,
        }
        createComment(meetingId, commentData).then((res) => {
            setReplyContent("");

            fetchComments();
        }).catch((err) => {
            console.error(err);
            alert("답글 등록에 실패했습니다.");
        });
    }

    // 부모 댓글만 필터링
    const parentComments = comments.filter(c => !c.parentCommentId);

    return (
        <>
            <div className={styles.commentList}>
                {comments.length === 0 ? (
                    <p>아직 작성된 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
                ) : (
                    parentComments.map((comment) => {

                        // 권한 체크
                        const isAuthor = Number(user?.memberId) === Number(comment.writerId);
                        const isHost = Number(user?.memberId) === Number(hostUserId);
                        const canDelete = isAuthor || isHost;

                        // 현재 부모의 자식 댓글 필터링
                        const childComments = comments.filter(c => c.parentCommentId === comment.commentId);

                        console.log("댓글 삭제 여부:", comment.commentId, comment.isDeleted);
                        return (
                            <div key={comment.commentId} className={styles.commentGroup}>

                                {/* --- 부모 댓글 영역 --- */}
                                <article className={styles.commentItem}>
                                    <img
                                        src={comment.profileImage || defaultUserImage}
                                        alt={`${comment.nickname} 프로필`}
                                        className={`${styles.commentAvatar} ${!comment.profileImage ? styles.defaultAvatar : ""}`}
                                    />
                                    <div>
                                        <div className={styles.commentMeta}>
                                            <strong>{comment.nickname}</strong>
                                            <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                        </div>
                                        <p>{comment.content}</p>

                                        {/* 아이콘 액션 버튼 영역 */}
                                        <div className={styles.actionWrap}>
                                            {/* 1. 답글 아이콘 버튼 */}
                                            {!comment.isDeleted && (

                                                <button
                                                    className={styles.iconBtn}
                                                    onClick={() => {
                                                        setReplyingTo(replyingTo === comment.commentId ? null : comment.commentId);
                                                    }}
                                                >
                                                    <UiIcon name="comment" className={styles.actionIcon}/>
                                                    <span>{childComments.length}</span>
                                                </button>
                                            )}

                                            {canDelete && (
                                                <button
                                                    className={`${styles.iconBtn} ${styles.iconBtnTrash}`}
                                                    onClick={() => handleDeleteComment(comment.commentId)}
                                                    title="댓글 삭제"
                                                >
                                                    <UiIcon name="trash" className={styles.actionIcon}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>

                                {/* --- 대댓글 폼 (리스트 하단에 노출) --- */}
                                {replyingTo === comment.commentId && !comment.isDeleted && (
                                    <div className={styles.replyIndentBox}>


                                        {/* --- 대댓글 리스트 렌더링 --- */}
                                        {childComments.length > 0 &&  (
                                            <div className={styles.replyIndentBox}>
                                                {childComments.map((child) => {
                                                    const isChildAuthor = user?.memberId && child.writerId && String(user.memberId) === String(child.writerId);
                                                    const isChildHost = user?.memberId && hostUserId && String(user.memberId) === String(hostUserId);
                                                    const canChildDelete = isChildAuthor || isChildHost;

                                                    return (
                                                        <article key={child.commentId}
                                                                 className={`${styles.commentItem} ${styles.childCommentBox}`}>
                                                            <img
                                                                src={child.profileImage || defaultUserImage}
                                                                alt={`${child.nickname} 프로필`}
                                                                className={`${styles.commentAvatar} ${!child.profileImage ? styles.defaultAvatar : ""}`}
                                                            />
                                                            <div>
                                                                <div className={styles.commentMeta}>
                                                                    <strong>{child.nickname}</strong>
                                                                    <span>{new Date(child.createdAt).toLocaleString()}</span>
                                                                </div>
                                                                <div className={styles.replyContentWrap}>
                                                                    <p>{child.content}</p>

                                                                    {/* 자식 댓글 삭제 휴지통 아이콘 */}
                                                                    {canChildDelete && (
                                                                        <div className={styles.actionWrap}>
                                                                            <button
                                                                                className={`${styles.iconBtn} ${styles.iconBtnTrash}`}
                                                                                onClick={() => handleDeleteComment(child.commentId)}
                                                                                title="대댓글 삭제"
                                                                            >
                                                                                <UiIcon name="trash"
                                                                                        className={styles.actionIcon}/>
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                </div>
                                                            </div>
                                                        </article>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {isAuthenticated? (

                                        <form
                                            className={styles.replyCommentForm}
                                            onSubmit={(e) => handleReplySubmit(e, comment.commentId)}>
                                            <textarea
                                                value={replyContent}
                                                maxLength={100}
                                                onChange={(e) => {
                                                    if (e.target.value.length <= 100) {
                                                        setReplyContent(e.target.value)
                                                    }
                                                }}
                                                placeholder="답글을 입력하세요."
                                            />
                                            <div className={styles.charCount}>
                                                {replyContent.length} / 100
                                            </div>
                                            <div className={styles.replySubmitBtn}>
                                                <button type="submit" className={styles.submitBtn}>
                                                    <UiIcon name="arrow" className={styles.actionIcon}/>
                                                </button>
                                            </div>
                                        </form>
                                        ):(
                                            <p className={styles.loginMessage}>답글을 작성하려면 로그인이 필요합니다.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* 최하단 메인 댓글 작성 폼 */}
            {isAuthenticated ? (
                <form className={styles.commentForm} onSubmit={handleCommentSubmit}>
                    <textarea
                        value={content}
                        maxLength={100}
                        onChange={(e) => {
                            if (e.target.value.length <= 100) {
                                setContent(e.target.value)
                            }
                        }}
                        placeholder="모임장에게 궁금한 점이나 참여 전에 확인하고 싶은 내용을 남겨보세요."
                    />
                    <div className={styles.charCount}>
                        {content.length} / 100
                    </div>
                    <div className={styles.formActions}>
                        <button type="submit">
                            댓글 등록
                        </button>
                    </div>
                </form>
            ) : (
                <p className={styles.loginMessage}>댓글을 작성하려면 로그인이 필요합니다.</p>
            )}
        </>
    )
}
