import MeetingFormPage from "./MeetingFormPage.jsx";
import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {getMeeting, getMeetings, updateMeeting} from "../api/meetingApi.js";
import DeleteMeetingButton from "./DeleteMeetingButton.jsx";
import styles from "../styles/MeetingCreatePage.module.css";
import {useAuth} from "../contexts/AuthContext.jsx";

export default function MeetingEditPage() {

  const {meetingId} = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const {isAuthenticated, user} = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);


  //1.기존 데이터 불러오기
  useEffect(()=>{
    if (!isAuthenticated) {
      alert("로그인이 필요한 서비스입니다.");
      navigate(-1);
      return;
    }
    getMeeting(meetingId).then((res)=>{
      const meeting = res.data;
      if (Number(user?.memberId) !== Number(meeting.hostUserId)) {
        alert("해당 모임을 수정할 권한이 없습니다.");
        navigate("/", { replace: true });
        return;
      }
      setInitialData(res.data);
      setIsAuthorized(true);
    }).catch((err)=>{
      console.log(err);
      alert("모임 정보를 불러오는데 실패했습니다.")
      navigate("/meetings");
    })
  },[meetingId, navigate, user, isAuthenticated]);

  if(!isAuthorized) return null;

  //2.수정 api호출 로직
  const handleUpdate = (formData) => {
    updateMeeting(meetingId, formData).then((res)=>{
      console.log(res);
      alert("모임이 수정되었습니다.");
      navigate(`/meetings/${meetingId}`); //해당 모임의 상세페이지로 이동
  }).catch((err)=>{
    console.log(err);
    if(err.response?.status === 401){
      alert("로그인이 만료되었습니다.");
      navigate("/login");
    }else{
    alert(err.response?.data?.message || "모임 수정 중 오류가 발생했습니다.")}
    });
  }
  //데이터를 가져오는 중일 때
  if(!initialData){
    return (
        <div>모임 정보를 불러오는 중...</div>
    )
  }

  return (
      <>
        <MeetingFormPage title="모임 수정하기"
                         initialData={initialData}
                         onSubmit={handleUpdate}/>
      </>
      )

}
