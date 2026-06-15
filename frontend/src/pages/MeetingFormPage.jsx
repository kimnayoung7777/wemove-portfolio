import {useEffect, useMemo, useRef, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import styles from "../styles/MeetingCreatePage.module.css";
import SportPickerModal from "../components/SportPickerModal2.jsx";
import RegionPickerModal from "../components/RegionPickerModal.jsx";
import ReactCalendarDatePicker from "../components/ReactCalendarDatePicker.jsx";
import {useAuth} from "../contexts/AuthContext.jsx";
import {getSports} from "../api/sportApi.js";
import {getRegions} from "../api/regionApi.js";
import {getMyActivity} from "../api/memberApi.js";
import DeleteMeetingButton from "./DeleteMeetingButton.jsx";

const normalizeText = (value = "") => String(value).trim();

const intersectsCalendarDate = (meeting, targetDate) => {
    if (!meeting?.meetingDate || !meeting?.startTime || !targetDate) return false;

    const dayStart = new Date(`${targetDate}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const start = new Date(
        `${meeting.meetingDate}T${String(meeting.startTime).slice(0, 5)}:00`,
    );
    const rawEndTime = String(meeting.endTime || "").slice(0, 5);
    const end = new Date(start);
    if (rawEndTime) {
        const [hour, minute] = rawEndTime.split(":").map(Number);
        end.setHours(hour, minute, 0, 0);
        if (rawEndTime <= String(meeting.startTime).slice(0, 5)) {
            end.setDate(end.getDate() + 1);
        }
    } else {
        end.setHours(end.getHours() + 2);
    }

    return start < dayEnd && end > dayStart;
};
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;

export default function MeetingFormPage({initialData, onSubmit, title}) {
    const {meetingId} = useParams();
    const isEditMode = !!meetingId;

    const navigate = useNavigate();
    const {isAuthenticated,user} = useAuth();
    const fileInputRef = useRef(null);
    const inputRefs = useRef({});

    const getTodayString = () => new Date().toISOString().split('T')[0];

    const initialFormValue = initialData || {
        sportId: null, regionId: null, title: "", content: "", placeName: "", address: "",
        latitude: null, longitude: null, meetingDate: "", startTime: "", endTime: "", maxMembers: "",
        meetingType: "ONE_TIME", repeatType: "NONE", supplies: "", guideText: "", status: "RECRUITING",
    };

    const [form, setForm] = useState(initialFormValue);
    const [files, setFiles] = useState([]);
    const [sports, setSports] = useState([]);
    const [regions, setRegions] = useState([]);

    const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
    const [isSportModalOpen, setIsSportModalOpen] = useState(false);

    const [selectedSportName, setSelectedSportName] = useState("");
    const [selectedRegion, setSelectedRegion] = useState({sido: "", sigungu: "", dong: ""});
    const [sameDayMeetings, setSameDayMeetings] = useState([]);


    // 썸네일 미리보기
    const previews = useMemo(() => {
        return files.map((file) => {
            if (file.url) {
                return {name: file.name, url: file.url};
            }
            return {name: file.name, url: URL.createObjectURL(file)};
        });
    }, [files]);

    // 계층형 지역 데이터
    const regionHierarchy = useMemo(() => {
        const grouped = new Map();
        regions.forEach((region) => {
            if (!grouped.has(region.sido)) grouped.set(region.sido, new Map());
            const sigunguMap = grouped.get(region.sido);
            if (!sigunguMap.has(region.sigungu)) sigunguMap.set(region.sigungu, []);
            sigunguMap.get(region.sigungu).push(region.dong);
        });
        return [...grouped.entries()].sort((l, r) => l[0].localeCompare(r[0], "ko")).map(([sido, sigunguMap]) => ({
            sido,
            sigungus: [...sigunguMap.entries()].sort((l, r) => l[0].localeCompare(r[0], "ko")).map(([sigungu, dongs]) => ({
                sigungu,
                dongs: [...new Set(dongs)].sort((l, r) => l.localeCompare(r, "ko")),
            })),
        }));
    }, [regions]);

    // 시간 옵션 (에러 수정된 부분)
    const timeOptions = useMemo(() => {
        const options = [];
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const todayStr = getTodayString(); // 선언된 함수 안전하게 호출

        for (let i = 0; i < 24; i++) {
            for (let m = 0; m < 60; m += 10) {
                // 오늘 날짜일 때만 시간 필터링
                if (form.meetingDate === todayStr) {
                    if (i < currentHour || (i === currentHour && m <= currentMinute)) {
                        continue;
                    }
                }
                const p = i < 12 ? '오전' : '오후';
                const hDisplay = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                const valH = String(i).padStart(2, '0');
                const valM = String(m).padStart(2, '0');

                options.push({
                    value: `${valH}:${valM}`,
                    label: `${p} ${String(hDisplay).padStart(2, '0')}:${valM}`
                });
            }
        }
        return options;
    }, [form.meetingDate]);

    // 메모리 누수 방지
    useEffect(() => {
        return () => previews.forEach((item) => URL.revokeObjectURL(item.url));
    }, [previews]);

    // 초기 데이터 로드 (종목, 지역)
    useEffect(() => {
        getSports().then((res) => {
            setSports(res.data);
        }).catch((err) => {
            console.log(err)
        });
        getRegions().then((res) => {
            setRegions(res.data.map(r => ({
                regionId: r.regionId,
                sido: normalizeText(r.sido),
                sigungu: normalizeText(r.sigungu),
                dong: normalizeText(r.dong),
            })));
        }).catch((err) => {
            console.log(err)
        });
    }, []);

    // 폼 초기값 세팅 (수정 모드일 때)
    useEffect(() => {
        if (!initialData || sports.length === 0 || regions.length === 0) return;

        const foundSport = sports.find(s => s.name === initialData.sportName);
        const foundRegion = regions.find(r =>
            `${r.sido} ${r.sigungu} ${r.dong}` === initialData.regionName);

        const formattedStartTime = initialData.startTime ? initialData.startTime.substring(0, 5) : "";
        const formattedEndTime = initialData.endTime ? initialData.endTime.substring(0, 5) : "";

        setForm(prev => ({
            ...prev,
            ...initialData,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            sportId: foundSport ? foundSport.sportId : prev.sportId,
            regionId: foundRegion ? foundRegion.regionId : prev.regionId,
        }));

        if (initialData.sportName) {
            setSelectedSportName(initialData.sportName);
        }
        if (initialData.regionName) {
            const parts = initialData.regionName.split(" ");
            setSelectedRegion({
                sido: parts[0] || "",
                sigungu: parts[1] || "",
                dong: parts[2] || "",
            });
        }
        if (initialData.thumbnailImage) {
            console.log("이미지 url확인: ", initialData.thumbnailImage);
            setFiles([{name: "기존 썸네일", url: initialData.thumbnailImage}]);
        }
    }, [initialData, sports, regions]);

    useEffect(() => {
        if (!user?.memberId || !form.meetingDate) {
            setSameDayMeetings([]);
            return;
        }

        let active = true;
        getMyActivity(user.memberId)
            .then((response) => {
                if (!active) return;
                const payload = response.data || {};
                const meetings = [
                    ...(payload.hostedMeetings || []),
                    ...(payload.approvedMeetings || []),
                    ...(payload.pendingMeetings || []),
                ]
                    .filter((meeting) =>
                        intersectsCalendarDate(meeting, form.meetingDate) &&
                        Number(meeting.meetingId) !== Number(meetingId) &&
                        !["CANCELLED", "COMPLETED"].includes(meeting.status),
                    )
                    .filter(
                        (meeting, index, array) =>
                            array.findIndex(
                                (item) => Number(item.meetingId) === Number(meeting.meetingId),
                            ) === index,
                    );
                setSameDayMeetings(meetings);
            })
            .catch(() => {
                if (active) setSameDayMeetings([]);
            });

        return () => {
            active = false;
        };
    }, [form.meetingDate, meetingId, user?.memberId]);


    // ★ 5. 일반 핸들러 함수들

    const regionDisplayText = selectedRegion.dong ? `${selectedRegion.sido} ${selectedRegion.sigungu} ${selectedRegion.dong}` : "";

    const handleAddressSearch = () => {
        new window.daum.Postcode({
            oncomplete: function (data) {
                let addr = '';
                let extraAddr = '';

                if (data.userSelectedType === 'R') {
                    addr = data.roadAddress;
                } else {
                    addr = data.jibunAddress;
                }

                if (data.userSelectedType === 'R') {
                    if (data.bname !== '' && /[동로가]$/.test(data.bname)) {
                        extraAddr += data.bname;
                    }
                    if (data.buildingName !== '' && data.apartment === 'Y') {
                        extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
                    }
                    if (extraAddr !== '') {
                        extraAddr = ' (' + extraAddr + ')';
                    }
                }
                const fullAddress = addr + extraAddr;

                setForm((prev) => ({
                    ...prev, address: fullAddress
                }));
            }
        }).open();
    };

    const handleCustomBtnClick = () => fileInputRef.current.click();

    const handleSportApply = (d) => {
        if (d) {
            setForm(p => ({...p, sportId: d.sportId}));
            setSelectedSportName(d.name);
        } else {
            // "전체 운동" 등 선택 해제 시
            setForm(p => ({...p, sportId: null}));
            setSelectedSportName("");
        }
        setIsSportModalOpen(false);
    };

    const handleRegionApply = (d) => {
        setSelectedRegion({sido: d.sido, sigungu: d.sigungu, dong: d.dong});
        const match = regions.find(r =>
            r.sido === d.sido &&
            r.sigungu === d.sigungu &&
            r.dong === d.dong
        );
        if (match) {
            setForm(p => ({...p, regionId: match.regionId}));
        }
        setIsRegionModalOpen(false);
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        const limits = {
            title: 40,
            placeName: 40,
            supplies: 100,
            content: 100
        }
        if(limits[name] && value.length > limits[name]) {
            alert(`${limits[name]}자까지만 입력 가능합니다.`);
            setForm(p => ({...p, [name]: value.substring(0, limits[name])}));
            return;
        }
        setForm(p => {
            const nextValue = ["sportId", "regionId", "maxMembers"].includes(name)
                ? Number(value)
                : value;
            const nextForm = {...p, [name]: nextValue};
            if (name === "startTime" && p.endTime && p.endTime === value) {
                nextForm.endTime = "";
            }
            return nextForm;
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file?.size > MAX_THUMBNAIL_SIZE) {
            alert("10MB 이하만 가능합니다.");
            return;
        }
        if (file) setFiles([file]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (nameToRemove) => {
        setFiles(files.filter(f => f.name !== nameToRemove));
    };

    const handleRemoveImage = () => {
        if (files.length > 0) {
            removeFile(files[0].name);
        }
        setForm(prev => ({
            ...prev,
            thumbnailImage: null,
            isImageRemoved: true,
        }));
    };
    const minRequiredMembers = isEditMode && initialData?.approvedCount ? Math.max(2, initialData?.approvedCount) : 2;

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("onsubmit 함수확인: ", onSubmit)

        // 1. 모임 수정시 설정, 승인 인원에 따른 모집상태 변경
        const currentMax = Number(form.maxMembers);
        const approvedCount = initialData?.approvedCount || 0;

        let changeStatus = form.status;

        if (currentMax === approvedCount) {
            changeStatus = 'CLOSED';
        } else if (currentMax > approvedCount) {
            if (form.status === 'CLOSED' || form.status === 'RECRUITING') {
                changeStatus = 'RECRUITING';
            }
        }

        // 2. ★ 백엔드로 보낼 "최종 데이터 객체"를 여기서 미리 만듭니다! ★
        let finalForm = { ...form, status: changeStatus };
        setForm(finalForm);

        // 모임 등록 시 참여인원 2명 이상으로
        if (Number(finalForm.maxMembers) < minRequiredMembers) {
            if (minRequiredMembers > 2) {
                alert(`모집 인원은 현재 승인된 인원 (${initialData.approvedCount}명) 이상이어야 합니다.`)
            } else {
                alert("참여 인원은 본인 포함 최소 2명 이상이어야 합니다.");
            }
            inputRefs.current.maxMembers?.focus();
            return;
        }

        // 당일 시간 유효성 검사 로직
        const selectedDate = new Date(form.meetingDate);
        const today = new Date();

        const isToday = selectedDate.getFullYear() === today.getFullYear() &&
            selectedDate.getMonth() === today.getMonth() &&
            selectedDate.getDate() === today.getDate();

        if (isToday) {
            const [selectedHour, selectedMinute] = form.startTime.split(":").map(Number);
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();

            if (selectedHour < currentHour || (selectedHour === currentHour && selectedMinute <= currentMinute)) {
                alert("당일 모임은 현재 시간 이후로만 설정 가능합니다.");
                inputRefs.current.startTime?.focus();
                return;
            }
        }

        if (finalForm.startTime && finalForm.endTime &&
            finalForm.endTime === finalForm.startTime) {
            alert("시작 시간과 종료 시간은 같을 수 없습니다.");
            inputRefs.current.endTime?.focus();
            return;
        }
        if (!finalForm.sportId && selectedSportName) {
            const s = sports.find(x => x.name === selectedSportName);
            if (s) finalForm.sportId = s.sportId;
        }

        if (!finalForm.regionId && selectedRegion.sido) {
            const r = regions.find(x =>
                x.sido === selectedRegion.sido &&
                x.sigungu === selectedRegion.sigungu &&
                x.dong === selectedRegion.dong
            );
            if (r) finalForm.regionId = r.regionId;
        }

        const requiredFields = [
            {key: "title", label: "모임 제목", refKey: "title"},
            {key: "address", label: "주소", refKey: "address"},
            {key: "placeName", label: "상세 주소", refKey: "placeName"},
            {key: "meetingDate", label: "날짜", refKey: "meetingDate"},
            {key: "startTime", label: "시작 시간", refKey: "startTime"},
            {key: "endTime", label: "종료 시간", refKey: "endTime"},
            {key: "maxMembers", label: "모집 인원", refKey: "maxMembers"},
            {key: "supplies", label: "준비물", refKey: "supplies"},
            {key: "guideText", label: "진행 안내", refKey: "guideText"},
            {key: "content", label: "모임 소개", refKey: "content"}
        ];

        for (const f of requiredFields) {
            if (!finalForm[f.key] || String(form[f.key]).trim() === "") {
                alert(`${f.label}을(를) 입력해주세요.`);
                inputRefs.current[f.refKey]?.focus();
                inputRefs.current[f.refKey]?.scrollIntoView({behavior: 'smooth', block: 'center'});
                return;
            }
        }

        if (!finalForm.sportId) {
            alert("운동 종목을 선택해주세요.");
            setIsSportModalOpen(true);
            return;
        }
        if (!finalForm.regionId) {
            alert("지역을 선택해주세요.");
            setIsRegionModalOpen(true);
            return;
        }
        if (!isAuthenticated) {
            alert("로그인이 필요합니다.");
            navigate("/login");
            return;
        }

        const formData = new FormData();
        formData.append("request", new Blob([JSON.stringify(finalForm)], {type: "application/json"}));
        if (files.length > 0) formData.append("image", files[0]);

        // 💡 3. 부모가 onSubmit을 제대로 줬는지 확인 후 실행
        if (typeof onSubmit === "function") {
            onSubmit(formData);
        } else {
            alert("저장 기능이 연결되지 않았습니다. 상위 페이지(Create/Edit) 컴포넌트를 확인해주세요.");
            console.error("props로 전달받은 onSubmit이 없습니다.");
        }
    };

    return (

        <div className={styles.page}>
            <div className={styles.pageTitle}>
                <div>
                    <h1>{title}</h1>
                    <p>{isEditMode ? "참가 예정인 사람들도 헷갈리지 않도록, 바뀐 정보가 한눈에 보이게 정리해두세요." : "제목, 장소, 시간, 소개와 대표 사진까지 정리하면 훨씬 신뢰감 있는 모임 페이지를 만들 수 있습니다."}

                    </p>
                </div>
            </div>

            <section className={styles.formIntro}>
                <h2>{isEditMode ? "기존 흐름은 유지하고, 필요한 부분만 정확하게 다듬어보세요." : "좋은 모임은 한눈에 이해되는 정보에서 시작됩니다."}</h2>
                <p>
                    참가자는 제목과 썸네일, 장소, 분위기를 먼저 봅니다. 처음 보는 사람도
                    바로 감을 잡을 수 있게 간결하고 선명하게 구성해보세요.
                </p>
                <div className={styles.formHintGrid}>
                    <article>
                        <span>제목 작성 팁</span>
                        <strong>지역 + 운동 + 시간대가 자연스럽게 보이도록 쓰기</strong>
                    </article>
                    <article>
                        <span>사진 등록 팁</span>
                        <strong>실제 분위기가 잘 보이는 밝은 운동 사진 선택</strong>
                    </article>
                    <article>
                        <span>소개 작성 팁</span>
                        <strong>
                            초보 가능 여부, 준비물, 진행 방식을 짧고 명확하게 안내
                        </strong>
                    </article>
                </div>
            </section>

            <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
                <label className={styles.full}>
                    <div className={styles.titleRow}>
                        <span className={styles.requiredLabel}>모임 제목</span>
                        <p className={styles.requiredNotice}>* 표시는 필수 입력 항목입니다.</p>
                    </div>
                    <input
                        ref={(el) => (inputRefs.current.title = el)}
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="예: 야당역 5km 러닝 크루 모집 (최대 40글자)"
                        maxLength="40"
                    />

                </label>
                {/* 운동 종목 선택 영역 */}
                <label>
                    <span className={styles.requiredLabel}>운동 종목</span>
                    <div className={styles.pickerRow}>
                        <button
                            type="button"
                            className={styles.pickerButton}
                            onClick={() => setIsSportModalOpen(true)}
                        >
                            종목 조회
                        </button>
                        <div className={styles.pickerSummary}>
                            <span className={styles.pickerLabel}>선택 종목</span>
                            <span
                                className={
                                    selectedSportName ? styles.valueText : styles.placeholderText
                                }
                            >
                {selectedSportName || "운동 종목을 선택해주세요"}
              </span>
                        </div>
                    </div>
                </label>
                {/* 지역 선택 영역 */}
                <label>
                    <span className={styles.requiredLabel}>지역</span>
                    <div className={styles.pickerRow}>
                        <button
                            type="button"
                            className={styles.pickerButton}
                            onClick={() => setIsRegionModalOpen(true)}
                        >
                            지역 조회
                        </button>
                        <div className={styles.pickerSummary}>
                            <span className={styles.pickerLabel}>선택 지역</span>
                            <span
                                className={
                                    regionDisplayText ? styles.valueText : styles.placeholderText
                                }
                            >
                {regionDisplayText || "지역을 선택해주세요."}
              </span>
                        </div>
                    </div>
                </label>

                <label>
                    <span className={styles.requiredLabel}>주소</span>
                    <input
                        ref={(el) => (inputRefs.current.address = el)}
                        name="address"
                        value={form.address}
                        onClick={handleAddressSearch}
                        readOnly
                        placeholder="주소를 설정하세요."
                        style={{cursor: "pointer"}}
                    />
                </label>
                <label>
                    <span className={styles.requiredLabel}>상세 주소</span>
                    <input
                        ref={(el) => (inputRefs.current.placeName = el)}
                        name="placeName"
                        value={form.placeName}
                        onChange={handleChange}
                        placeholder="예: 야당역 2번 출구 앞(최대 40글자)"
                        max="40"
                    />
                </label>
                <label>
                    <span className={styles.requiredLabel}>날짜</span>
                    <ReactCalendarDatePicker
                        inputRef={(el) => (inputRefs.current.meetingDate = el)}
                        name="meetingDate"
                        value={form.meetingDate}
                        onChange={handleChange}
                        type={form.meetingDate ? "date" : "text"}
                        placeholder="날짜를 설정하세요."
                        onClick={(e) => {
                            const target = e.target;

                            // 1. 클릭하는 순간 즉시 date 타입으로 변경
                            if (target.type !== "date") {
                                target.type = "date";
                            }

                            // 2. 브라우저가 타입을 바꿀 아주 짧은 시간(10ms)을 준 뒤 달력 강제 호출
                            setTimeout(() => {
                                try {
                                    target.showPicker();
                                } catch (error) {
                                    // Safari 등 구형 브라우저 대비 안전장치
                                }
                            }, 10);
                        }}
                        onBlur={(e) => {
                            // 달력을 닫았는데 값이 없으면 다시 text(Placeholder)로 복귀
                            if (!e.target.value) {
                                e.target.type = "text";
                            }
                        }}
                        min={getTodayString()}
                    />
                </label>

                <label>
                    <span className={styles.requiredLabel}>시작 시간</span>
                    <select
                        ref={(el) => (inputRefs.current.startTime = el)}
                        name="startTime"
                        value={form.startTime}
                        onChange={handleChange}
                        className={`${styles.timeSelect} ${!form.startTime ? styles.placeholderText : styles.valueText}`}
                    >
                        <option value="" disabled hidden>
                            시간을 설정하세요.
                        </option>

                        {timeOptions.map((time) => (
                            <option
                                key={time.value}
                                value={time.value}
                                className={styles.timeOption}
                            >
                                {time.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    <span className={styles.requiredLabel}>종료 시간</span>
                    <select
                        ref={(el) => (inputRefs.current.endTime = el)}
                        name="endTime"
                        value={form.endTime}
                        onChange={handleChange}
                        className={`${styles.timeSelect} ${!form.endTime ? styles.placeholderText : styles.valueText}`}
                    >
                        <option value="" disabled hidden>
                            종료 시간을 설정하세요.
                        </option>
                        {timeOptions
                            .filter((time) => !form.startTime || time.value !== form.startTime)
                            .map((time) => (
                                <option
                                    key={time.value}
                                    value={time.value}
                                    className={styles.timeOption}
                                >
                                    {time.label}
                                    {form.startTime && time.value < form.startTime
                                        ? " (다음 날)"
                                        : ""}
                                </option>
                            ))}
                    </select>
                    {form.startTime && form.endTime && form.endTime < form.startTime ? (
                        <small className={styles.nextDayHint}>
                            종료 시간은 다음 날 {form.endTime}입니다.
                        </small>
                    ) : null}
                </label>

                {sameDayMeetings.length > 0 ? (
                    <div className={`${styles.full} ${styles.scheduleNotice}`}>
                        <strong>선택한 날짜에 이미 일정이 있습니다.</strong>
                        <p>
                            {sameDayMeetings
                                .slice(0, 3)
                                .map((meeting) => {
                                    const start = String(meeting.startTime || "").slice(0, 5);
                                    const end = String(meeting.endTime || "").slice(0, 5);
                                    const nextDay = end && end < start ? " 다음 날" : "";
                                    return `${meeting.title} (${start}${end ? ` ~${nextDay} ${end}` : ""})`;
                                })
                                .join(", ")}
                            {sameDayMeetings.length > 3
                                ? ` 외 ${sameDayMeetings.length - 3}개`
                                : ""}
                        </p>
                        <small>시간이 겹치면 모임 생성 또는 수정이 제한됩니다.</small>
                    </div>
                ) : null}

                <label>
                    <span className={styles.requiredLabel}>모집 인원 (본인 포함)</span>
                    <input
                        ref={(el) => (inputRefs.current.maxMembers = el)}
                        name="maxMembers"
                        value={form.maxMembers}
                        onChange={handleChange}
                        type="number"
                        min={isEditMode && initialData?.approvedCount ? initialData?.approvedCount : "2"}
                    />
                </label>
                <label>
                    <span className={styles.requiredLabel}>모집 상태</span>
                    <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        disabled={!isEditMode}
                    >
                        <option value="RECRUITING">모집중</option>
                        <option value="CLOSED">모집완료</option>
                    </select>
                </label>

                <label className={styles.full}>
                    <span className={styles.requiredLabel}>준비물</span>
                    <input
                        name="supplies"
                        value={form.supplies}
                        onChange={handleChange}
                        placeholder="예: 편한 운동복, 물, 개인 이어폰 (최대 100글자)"
                        maxLength="100"
                    />
                    <div style={{ textAlign: "right", fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        {form.supplies.length} / 100
                    </div>
                </label>

                <label className={styles.full}>
                    <span className={styles.requiredLabel}>모임 소개</span>
                    <input
                        name="content"
                        value={form.content}
                        onChange={handleChange}
                        placeholder="모임 분위기 등 간단한 모임 소개를 적어주세요. (최대 100글자)"
                    />
                    <div style={{ textAlign: "right", fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        {form.content.length} / 100
                    </div>
                </label>

                <label className={styles.full}>
                    <span className={styles.requiredLabel}>진행 안내</span>
                    <textarea
                        name="guideText"
                        value={form.guideText}
                        onChange={handleChange}
                        placeholder="[진행 안내 사항을 적어주세요.]

- 집결 시간:
모임 시작 10분 전

- 주의사항:
우천 시 모임 취소 여부는 당일 오전 00시에 공지합니다.
늦으시는 분들은 채팅을 통해 연락 부탁드립니다.
운동 중 개인 부상에 대해서는 본인 책임이 크니 무리하지 마세요!
당일 뵙겠습니다!"
                    />
                </label>

                <label className={`${styles.full} ${styles.fileUploadWrapper}`}>
                    <span className={styles.fileUploadLabel}>대표 사진 등록</span>
                    <input
                        type="file"
                        accept="image/*"
                        className={styles.uploadInput}
                        multiple
                        ref={fileInputRef}
                        //className={styles.uploadInput}
                        onChange={handleFileChange}
                        style={{display: "none"}}
                    />

                    <small className={styles.uploadHint}>
                        대표 썸네일 1장만 등록할 수 있습니다. 최대 10MB까지 지원합니다.
                    </small>

                    <button
                        type="button"
                        onClick={handleCustomBtnClick}
                        className={styles.fileUploadButton}
                    >
                        파일 선택
                    </button>
                </label>

                {previews.length > 0 && (
                    <div className={`${styles.full} ${styles.reviewPreviewGrid}`}>
                        {previews.map((preview) => (
                            <article key={preview.name} className={styles.reviewPreviewCard}>
                                <img
                                    src={preview.url}
                                    alt={preview.name}
                                    className={styles.reviewPreviewImage}
                                />
                                <div className={styles.reviewPreviewMeta}>
                                    <span>{preview.name}</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <div className={`${styles.full} ${styles.formActions}`}>
                    {isEditMode && (
                        <div className={styles.formActions}> {/* 삭제 버튼을 감싸는 div 추가 */}
                            <DeleteMeetingButton meetingId={meetingId} onDeleted={() => navigate(`/meetings`)}/>
                        </div>

                    )}
                    <div className={styles.actionGroup}>
                        <Link to="/meetings">취소</Link>
                        <button type="submit">{isEditMode ? "모임 수정" : "모임 등록"}</button>

                    </div>
                </div>
            </form>


            {/*운동 종목 선택 모달*/}
            <SportPickerModal
                open={isSportModalOpen}
                sports={sports}
                selectedSportId={form.sportId} // 요렇게 ID 하나만 전달!
                onApply={handleSportApply}
                onClose={() => setIsSportModalOpen(false)}
            />
            {/*지역 선택 모달*/}
            <RegionPickerModal
                open={isRegionModalOpen}
                regions={regionHierarchy} // 변환된 계층형 데이터
                initialSelection={{
                    sido: selectedRegion.sido || "전체 시도",
                    sigungu: selectedRegion.sigungu || "전체 시군구",
                    dong: selectedRegion.dong || "전체 읍면동",
                }}
                onApply={handleRegionApply}
                onClose={() => {
                    setIsRegionModalOpen(false);
                }}
            />
        </div>


    )

}
