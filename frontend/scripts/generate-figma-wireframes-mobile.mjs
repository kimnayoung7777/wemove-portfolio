import fs from "fs";
import path from "path";

const outDir = path.resolve("figma-wireframes-mobile");
fs.mkdirSync(outDir, { recursive: true });

const W = 430;
const H = 932;

const c = {
  bg: "#f6f7f8",
  surface: "#ffffff",
  surfaceSoft: "#f9fafb",
  line: "#e5e7eb",
  text: "#111827",
  sub: "#6b7280",
  muted: "#8b95a1",
  blue: "#2563eb",
  blueSoft: "#eff6ff",
  green: "#ecfdf3",
  greenText: "#15803d",
};

function esc(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function svg(children, title = "WeMove Mobile") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none">
  <title>${esc(title)}</title>
  <defs>
    <linearGradient id="primaryButton" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="heroOverlay" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10213e"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  ${children.join("\n")}
</svg>`;
}

function rect(x, y, w, h, fill = c.surface, stroke = c.line, rx = 18) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
}

function text(x, y, value, size = 16, weight = 600, fill = c.text, anchor = "start") {
  const lines = String(value).split("\n");
  const lh = Math.round(size * 1.32);
  return `<text x="${x}" y="${y}" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lh}">${esc(line)}</tspan>`)
    .join("")}</text>`;
}

function line(x1, y1, x2, y2, stroke = c.line) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}"/>`;
}

function button(x, y, w, h, label, primary = false) {
  return [
    rect(x, y, w, h, primary ? "url(#primaryButton)" : c.surface, primary ? c.blue : c.line, 14),
    text(x + w / 2, y + h / 2 + 5, label, 14, 700, primary ? "#fff" : c.text, "middle"),
  ].join("\n");
}

function input(x, y, w, h, value, label = "") {
  return [
    label ? text(x, y - 8, label, 12, 700, c.sub) : "",
    rect(x, y, w, h, "#fff", c.line, 14),
    value ? text(x + 14, y + h / 2 + 5, value, 14, 500, c.muted) : "",
  ].join("\n");
}

function chip(x, y, label, active = false) {
  const w = Math.max(54, label.length * 12 + 18);
  return [
    rect(x, y, w, 32, active ? c.blueSoft : "#fff", active ? "#bfdbfe" : c.line, 999),
    text(x + w / 2, y + 21, label, 12, 700, active ? c.blue : c.sub, "middle"),
  ].join("\n");
}

function badge(x, y, label, tone = "default") {
  const map = {
    default: { fill: "#f3f4f6", text: "#374151" },
    sport: { fill: c.blueSoft, text: c.blue },
    green: { fill: c.green, text: c.greenText },
  };
  const t = map[tone];
  const w = Math.max(52, label.length * 12 + 16);
  return [
    rect(x, y, w, 26, t.fill, t.fill, 999),
    text(x + w / 2, y + 18, label, 11, 700, t.text, "middle"),
  ].join("\n");
}

function topBar(title = "WeMove") {
  return [
    rect(16, 16, 398, 74, "#fff", c.line, 22),
    rect(28, 34, 40, 40, c.blue, c.blue, 20),
    text(48, 60, "W", 18, 800, "#fff", "middle"),
    text(80, 60, title, 24, 800),
    rect(28, 102, 386, 48, "#fff", c.line, 16),
    text(56, 132, "모임, 지역, 운동 종목을 검색해보세요", 14, 500, c.muted),
    button(290, 34, 58, 34, "로그인", false),
    button(356, 34, 58, 34, "가입", true),
  ].join("\n");
}

function mobileMeetingCard(y, title, sport, desc, time) {
  return [
    rect(16, y, 398, 152, "#fff", c.line, 18),
    rect(30, y + 18, 94, 94, "#eef2f7", c.line, 16),
    badge(138, y + 18, sport, "sport"),
    badge(196, y + 18, "모집중", "green"),
    text(138, y + 60, title, 18, 800),
    text(138, y + 90, desc, 13, 500, c.sub),
    text(138, y + 116, time, 12, 500, c.muted),
    button(302, y + 102, 90, 36, "참가 신청", true),
  ].join("\n");
}

function homePage() {
  const parts = [topBar()];
  parts.push(rect(16, 164, 398, 220, "#fff", c.line, 22));
  parts.push(rect(16, 164, 398, 220, "url(#heroOverlay)", "transparent", 22));
  parts.push(text(34, 204, "LOCAL FITNESS COMMUNITY", 12, 700, "#dbeafe"));
  parts.push(text(34, 248, "이번 주말엔 새로운 크루와\n같이 운동할 사람을 찾아보세요", 26, 800, "#fff"));
  parts.push(text(34, 316, "관심 운동과 지역을 고르면 지금 참여 가능한 모임을 바로 볼 수 있어요.", 13, 500, "#dbeafe"));
  parts.push(rect(34, 332, 362, 40, "rgba(255,255,255,0.16)", "rgba(255,255,255,0.24)", 14));
  parts.push(input(42, 338, 166, 28, "지역 선택"));
  parts.push(input(214, 338, 90, 28, "운동"));
  parts.push(button(310, 338, 76, 28, "찾기", true));
  parts.push(rect(16, 402, 398, 126, "#fff", c.line, 18));
  parts.push(text(34, 436, "우리 동네 현황", 16, 800));
  parts.push(text(34, 466, "모집중 모임 24개", 14, 600, c.sub));
  parts.push(text(34, 492, "참여 예정 인원 128명", 14, 600, c.sub));
  parts.push(text(236, 436, "이번 주 일정", 16, 800));
  ["오늘 20:00 러닝", "내일 07:00 헬스", "토 18:00 배드민턴"].forEach((v, i) => {
    parts.push(text(236, 466 + i * 24, v, 13, 600, c.sub));
  });
  parts.push(rect(16, 546, 398, 82, "#fff", c.line, 18));
  let x = 30;
  ["전체", "러닝", "헬스", "풋살", "등산"].forEach((label, i) => {
    parts.push(chip(x, 570, label, i === 0));
    x += Math.max(54, label.length * 12 + 18) + 8;
  });
  parts.push(text(16, 664, "오늘의 추천 모임", 24, 800));
  parts.push(chip(16, 690, "전체", true));
  parts.push(chip(76, 690, "모집중"));
  parts.push(chip(148, 690, "마감임박"));
  parts.push(mobileMeetingCard(736, "야당역 5km 러닝 크루 모집", "러닝", "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다.", "야당역 2번 출구 · 오늘 20:00"));
  return svg(parts, "WeMove 모바일 홈");
}

function meetingListPage() {
  const parts = [topBar()];
  parts.push(text(16, 186, "모임 찾기", 28, 800));
  parts.push(text(16, 214, "지역과 운동 종목을 기준으로 지금 참여할 수 있는 모임을 빠르게 골라보세요.", 14, 500, c.sub));
  parts.push(rect(16, 234, 398, 146, "url(#heroOverlay)", "transparent", 22));
  parts.push(text(34, 282, "이번 주말, 동네에서 같이\n운동할 사람을 찾아보세요.", 26, 800, "#fff"));
  parts.push(button(292, 328, 104, 38, "모임 만들기", true));
  parts.push(rect(16, 396, 398, 122, "#fff", c.line, 18));
  let x = 30;
  ["전체", "러닝", "헬스", "풋살", "농구"].forEach((label, i) => {
    parts.push(chip(x, 414, label, i === 0));
    x += Math.max(54, label.length * 12 + 18) + 8;
  });
  parts.push(input(30, 456, 170, 42, "전체 지역"));
  parts.push(input(208, 456, 188, 42, "전체 상태"));
  parts.push(text(16, 556, "파주시 주변 모임", 24, 800));
  parts.push(mobileMeetingCard(592, "야당역 5km 러닝 크루 모집", "러닝", "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다.", "야당역 2번 출구 · 05.16 20:00"));
  parts.push(mobileMeetingCard(758, "운정 풋살장 저녁 경기", "풋살", "친목 위주 풋살 경기입니다.", "운정 스포츠파크 · 05.17 18:30"));
  return svg(parts, "WeMove 모바일 모임찾기");
}

function detailPage() {
  const parts = [topBar()];
  parts.push(rect(16, 164, 398, 194, "url(#heroOverlay)", "transparent", 22));
  parts.push(text(34, 240, "야당역 5km 러닝 크루 모집", 24, 800, "#fff"));
  parts.push(text(34, 278, "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다.", 14, 500, "#dbeafe"));
  parts.push(rect(16, 374, 398, 114, "#fff", c.line, 18));
  [["장소", "야당역 2번 출구"], ["시간", "오늘 20:00"], ["인원", "6 / 10명"]].forEach((v, i) => {
    parts.push(text(34, 410 + i * 24, `${v[0]}  ${v[1]}`, 14, 700, i === 0 ? c.text : c.sub));
  });
  parts.push(rect(16, 504, 398, 154, "#fff", c.line, 18));
  parts.push(text(34, 540, "모임 정보", 18, 800));
  parts.push(text(34, 574, "모임 방식  1회성 모임", 14, 600, c.sub));
  parts.push(text(34, 600, "반복 방식  없음", 14, 600, c.sub));
  parts.push(text(34, 626, "준비물  편한 운동복, 물, 이어폰", 14, 600, c.sub));
  parts.push(button(16, 676, 122, 44, "참가 신청", true));
  parts.push(button(146, 676, 76, 44, "수정", false));
  parts.push(button(230, 676, 132, 44, "신청자 관리", false));
  parts.push(rect(16, 738, 398, 160, "#fff", c.line, 18));
  parts.push(text(34, 774, "댓글 및 문의", 18, 800));
  parts.push(text(34, 806, "헬린이탈출  초보도 괜찮을까요?", 14, 600, c.sub));
  parts.push(text(34, 834, "배드민턴민지  주차 가능한가요?", 14, 600, c.sub));
  parts.push(input(34, 852, 270, 34, "댓글 남기기"));
  parts.push(button(312, 852, 84, 34, "등록", true));
  return svg(parts, "WeMove 모바일 모임상세");
}

function formPage(title, submit) {
  const parts = [topBar()];
  parts.push(text(16, 186, title, 28, 800));
  parts.push(rect(16, 214, 398, 680, "#fff", c.line, 20));
  parts.push(rect(34, 238, 362, 120, c.surfaceSoft, c.line, 16));
  parts.push(text(130, 306, "대표 이미지 업로드", 16, 700, c.sub, "middle"));
  let y = 390;
  ["모임 제목", "운동 종목", "지역", "장소명", "날짜", "시간", "최대 인원", "준비물", "진행 안내"].forEach((label, i) => {
    parts.push(input(34, y, 362, i >= 7 ? 58 : 42, label));
    y += i >= 7 ? 76 : 62;
  });
  parts.push(button(214, 840, 84, 42, submit, true));
  parts.push(button(306, 840, 90, 42, "취소", false));
  return svg(parts, `WeMove 모바일 ${title}`);
}

function managePage() {
  const parts = [topBar()];
  parts.push(text(16, 186, "신청자 관리", 28, 800));
  parts.push(rect(16, 214, 398, 92, "#fff", c.line, 18));
  parts.push(text(34, 248, "야당역 5km 러닝 크루 모집", 18, 800));
  parts.push(text(34, 276, "2026.05.16 · 야당역 2번 출구", 13, 500, c.sub));
  parts.push(rect(16, 322, 398, 440, "#fff", c.line, 18));
  parts.push(text(34, 358, "신청자 목록", 18, 800));
  [0,1,2].forEach((i)=>{
    const y = 386 + i * 118;
    parts.push(rect(34, y, 362, 96, c.surfaceSoft, c.line, 16));
    parts.push(text(52, y + 28, ["헬린이탈출","배드민턴민지","런린이철수"][i], 15, 700));
    parts.push(text(52, y + 54, ["초보도 함께 뛰기 괜찮을까요?","운동은 가볍게 즐기는 편입니다.","퇴근 후 참여 가능합니다."][i], 13, 500, c.sub));
    parts.push(button(240, y + 50, 64, 32, "승인", true));
    parts.push(button(312, y + 50, 64, 32, "거절", false));
  });
  parts.push(button(186, 780, 108, 40, "모집 완료", true));
  parts.push(button(302, 780, 94, 40, "상세로", false));
  return svg(parts, "WeMove 모바일 신청자관리");
}

function myPage() {
  const parts = [topBar()];
  parts.push(text(16, 186, "마이페이지", 28, 800));
  parts.push(rect(16, 214, 398, 124, "#fff", c.line, 18));
  parts.push(rect(34, 238, 58, 58, "#f3f4f6", c.line, 29));
  parts.push(text(108, 262, "러너민수", 22, 800));
  parts.push(text(108, 290, "경기 파주시 운정동", 14, 500, c.sub));
  parts.push(button(292, 248, 104, 36, "프로필 수정", false));
  parts.push(text(34, 322, "만든 모임 6   ·   신청한 모임 12   ·   참여 9", 13, 600, c.sub));
  parts.push(chip(16, 356, "내가 만든 모임", true));
  parts.push(chip(132, 356, "신청한 모임"));
  parts.push(chip(240, 356, "참여한 모임"));
  parts.push(mobileMeetingCard(406, "야당역 5km 러닝 크루 모집", "러닝", "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다.", "야당역 2번 출구 · 오늘 20:00"));
  parts.push(mobileMeetingCard(572, "운정 풋살장 저녁 경기", "풋살", "친목 위주 풋살 경기입니다.", "운정 스포츠파크 · 토요일 18:30"));
  return svg(parts, "WeMove 모바일 마이페이지");
}

function activityPage() {
  const parts = [topBar()];
  parts.push(text(16, 186, "내 활동", 28, 800));
  parts.push(rect(16, 214, 398, 88, "#fff", c.line, 18));
  parts.push(text(34, 248, "참여 기록 18   ·   작성 댓글 24", 14, 700, c.sub));
  parts.push(text(34, 276, "좋아요 36   ·   완료 모임 9", 14, 700, c.sub));
  parts.push(rect(16, 320, 398, 188, "#fff", c.line, 18));
  parts.push(text(34, 356, "최근 활동", 18, 800));
  ["야당역 러닝 모임에 참가 신청했어요.", "운정 풋살장 경기 신청이 승인되었어요.", "후기 작성이 가능한 모임이 생겼어요."].forEach((v, i)=>{
    parts.push(text(34, 390 + i*34, v, 14, 600, c.sub));
  });
  parts.push(mobileMeetingCard(528, "헬린이 루틴 공유 모임", "헬스", "운동 루틴과 식단을 편하게 나누는 소규모 모임입니다.", "금촌동 피트니스 센터 · 내일 19:00"));
  return svg(parts, "WeMove 모바일 내활동");
}

function reviewPage() {
  const parts = [topBar()];
  parts.push(text(16, 186, "후기 작성", 28, 800));
  parts.push(rect(16, 214, 398, 282, "#fff", c.line, 18));
  parts.push(input(34, 246, 362, 42, "모임 선택"));
  parts.push(text(34, 324, "별점 선택", 13, 700, c.sub));
  parts.push(text(34, 360, "★ ★ ★ ★ ☆", 28, 700, "#f59e0b"));
  parts.push(input(34, 390, 362, 76, "후기 작성"));
  parts.push(button(294, 516, 102, 40, "후기 등록", true));
  parts.push(rect(16, 574, 398, 320, "#fff", c.line, 18));
  parts.push(text(34, 610, "후기 목록", 18, 800));
  [0,1].forEach((i)=>{
    const y = 636 + i*118;
    parts.push(rect(34, y, 362, 96, c.surfaceSoft, c.line, 16));
    parts.push(text(50, y + 28, i===0?"야당역 러닝 모임":"운정 풋살장 경기", 15, 800));
    parts.push(text(50, y + 54, i===0?"러너지니 · ★★★★★":"풋살지훈 · ★★★★☆", 13, 600, c.sub));
    parts.push(text(50, y + 78, i===0?"같이 뛰는 분위기가 좋아서 부담 없었어요.":"매너를 중요하게 보는 분위기가 좋았습니다.", 12, 500, c.muted));
  });
  return svg(parts, "WeMove 모바일 후기");
}

function adminPage() {
  const parts = [topBar()];
  parts.push(text(16, 186, "관리자 페이지", 28, 800));
  [["회원 수","1,284"],["모임 수","246"],["신고 수","18"],["종목 수","12"]].forEach((v,i)=>{
    const x = 16 + (i%2)*206;
    const y = 214 + Math.floor(i/2)*98;
    parts.push(rect(x, y, 192, 82, "#fff", c.line, 18));
    parts.push(text(x + 18, y + 30, v[0], 13, 700, c.sub));
    parts.push(text(x + 18, y + 62, v[1], 24, 800));
  });
  parts.push(chip(16, 418, "회원 관리", true));
  parts.push(chip(102, 418, "모임 관리"));
  parts.push(chip(188, 418, "신고 관리"));
  parts.push(rect(16, 462, 398, 410, "#fff", c.line, 18));
  parts.push(text(34, 498, "회원 관리", 18, 800));
  [0,1,2].forEach((i)=>{
    const y = 526 + i*96;
    parts.push(rect(34, y, 362, 76, c.surfaceSoft, c.line, 16));
    parts.push(text(50, y + 28, ["user01","runner23","admin01"][i], 14, 700));
    parts.push(text(50, y + 52, ["러너민수","헬린이탈출","관리자"][i], 13, 500, c.sub));
    parts.push(button(322, y + 22, 58, 30, "상세", false));
  });
  return svg(parts, "WeMove 모바일 관리자");
}

function authPage(title, fields, primary, footer) {
  const parts = [
    rect(0, 0, W, H, "#0f172a", "transparent", 0),
    rect(0, 0, W, H, "url(#heroOverlay)", "transparent", 0),
    rect(20, 22, 138, 44, "rgba(255,255,255,0.2)", "rgba(255,255,255,0.18)", 18),
    rect(28, 28, 30, 30, c.blue, c.blue, 15),
    text(43, 49, "W", 14, 800, "#fff", "middle"),
    text(70, 50, "WeMove", 16, 800, "#fff"),
    rect(20, 134, 390, fields.length > 5 ? 660 : 520, "rgba(255,255,255,0.96)", c.line, 28),
    badge(46, 162, title, "sport"),
    text(46, 220, title === "로그인" ? "오늘은 누구와 같이\n움직여볼까요?" : title === "회원가입" ? "프로필을 만들고\n바로 시작하세요" : "계정 정보가 기억나지 않아도\n안전하게 다시 연결할 수 있어요", 28, 800),
  ];
  let y = 300;
  fields.forEach((field) => {
    if (field.type === "buttons") {
      parts.push(chip(46, y, "아이디 찾기", true));
      parts.push(chip(140, y, "비밀번호 재설정"));
      y += 56;
      return;
    }
    if (field.type === "inputButton") {
      parts.push(input(46, y, 244, 44, field.value, field.label));
      parts.push(button(300, y + 18, 86, 44, field.button, true));
      y += 70;
      return;
    }
    parts.push(input(46, y, 340, 44, field.value, field.label));
    y += 70;
  });
  parts.push(button(46, y + 10, 340, 48, primary, true));
  parts.push(text(216, y + 92, footer, 14, 600, c.sub, "middle"));
  return svg(parts, `WeMove 모바일 ${title}`);
}

function loginPage() {
  return authPage("로그인", [
    { label: "아이디 또는 이메일", value: "user01" },
    { label: "비밀번호", value: "••••" },
  ], "로그인", "회원가입 · 아이디/비밀번호 찾기");
}

function signupPage() {
  return authPage("회원가입", [
    { type: "inputButton", label: "아이디", value: "wemove_runner", button: "중복확인" },
    { type: "inputButton", label: "이메일", value: "runner@wemove.kr", button: "인증" },
    { label: "비밀번호", value: "비밀번호 입력" },
    { label: "비밀번호 확인", value: "비밀번호 다시 입력" },
    { label: "닉네임", value: "러너민수" },
    { label: "지역", value: "경기 파주시 운정동" },
    { label: "관심 운동 종목", value: "러닝, 헬스, 풋살" },
  ], "가입 완료", "이미 계정이 있어요");
}

function findAccountPage() {
  return authPage("계정 찾기", [
    { type: "buttons" },
    { label: "이름 또는 닉네임", value: "러너민수" },
    { type: "inputButton", label: "가입 이메일", value: "runner@wemove.kr", button: "인증" },
    { label: "인증번호", value: "123456" },
    { label: "결과 안내", value: "가입된 아이디: wemove_runner" },
  ], "아이디 확인", "로그인으로 돌아가기 · 회원가입");
}

const pages = {
  "m-01-home.svg": homePage,
  "m-02-meeting-list.svg": meetingListPage,
  "m-03-meeting-detail.svg": detailPage,
  "m-04-meeting-create.svg": () => formPage("모임 만들기", "등록"),
  "m-05-meeting-edit.svg": () => formPage("모임 수정", "수정"),
  "m-06-meeting-manage.svg": managePage,
  "m-07-activity.svg": activityPage,
  "m-08-my-page.svg": myPage,
  "m-09-review.svg": reviewPage,
  "m-10-admin.svg": adminPage,
  "m-11-login.svg": loginPage,
  "m-12-signup.svg": signupPage,
  "m-13-find-account.svg": findAccountPage,
};

Object.entries(pages).forEach(([file, create]) => {
  fs.writeFileSync(path.join(outDir, file), create(), "utf8");
});

const cards = Object.keys(pages)
  .map((file) => `<div class="card"><img src="./${file}" alt="${file}"/><p>${file}</p></div>`)
  .join("");

fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>WeMove Mobile Wireframes</title>
  <style>
    body{margin:0;padding:24px;background:#f3f4f6;font-family:Pretendard,sans-serif;}
    h1{margin:0 0 20px;font-size:28px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:14px;box-shadow:0 4px 14px rgba(15,23,42,.03)}
    img{width:100%;border:1px solid #e5e7eb;border-radius:16px;display:block}
    p{margin:10px 0 0;font-size:13px;font-weight:700;color:#4b5563}
  </style>
</head>
<body>
  <h1>WeMove 모바일 SVG 시안</h1>
  <div class="grid">${cards}</div>
</body>
</html>`,
  "utf8",
);

console.log(`Generated ${Object.keys(pages).length} mobile SVG wireframes in ${outDir}`);
