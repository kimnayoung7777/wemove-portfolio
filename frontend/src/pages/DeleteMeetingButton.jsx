import {deleteMeeting} from "../api/meetingApi.js";
import styles from "../styles/DeleteMeetingButton.module.css";


export default function DeleteMeetingButton({meetingId, onDeleted}){
    const handleDelete = () => {
        if(!window.confirm("삭제된 모임은 복구 할 수없습니다. 정말 삭제하시겠습니까?")){
            return;
        }
        deleteMeeting(meetingId).then((res)=>{
            console.log(res.data)
            alert("삭제되었습니다.");
            if(onDeleted){
                onDeleted(meetingId);
            }
        }).catch((err)=>{
            console.log(err);
            alert("삭제에 실패했습니다. 관리자에게 문의해주세요.")
        });
    }
    return (
        <div
            className={styles.deleteButton}
            onClick={handleDelete}
            role="button"
            tabIndex={0}
        >
            모임 삭제
        </div>
    );
}