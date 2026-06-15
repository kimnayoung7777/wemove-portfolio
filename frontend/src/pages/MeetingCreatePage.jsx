
import {createMeeting} from "../api/meetingApi.js";
import MeetingFormPage from "./MeetingFormPage.jsx";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../contexts/AuthContext.jsx";
import {useEffect, useState} from "react";


export default function MeetingCreatePage() {
  const navigate = useNavigate();
  const {isAuthenticated, loading} = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(()=>{
    if(!isAuthenticated){
      alert("로그인이 필요한 서비스입니다.")
      navigate(-1, {replace: true});
    }else{
      setIsAuthorized(true);
    }
  },[isAuthenticated, loading, navigate]);
  if(!isAuthorized){
    return null;
  }

  const handleCreate = (formData) =>{
    createMeeting(formData).then((res)=>{
      console.log(res);
      alert("모임 등록 완료");
      navigate("/");
    }).catch((err)=>{console.log(err);
      if(err.response?.status === 401){
        alert("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/login");
      }else{
        alert(err.response?.data?.message || "모임 등록 중 오류가 발생했습니다.")
      }
    });
  }
  return <MeetingFormPage title="모임 만들기" onSubmit={handleCreate} />;
}
