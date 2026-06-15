import fs from "fs";
import path from "path";

const outDir = path.resolve("figma-wireframes");
fs.mkdirSync(outDir, { recursive: true });

const W = 1600;
const H = 1024;

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
  orange: "#fff7ed",
  orangeText: "#b45309",
  red: "#fef2f2",
  redText: "#dc2626",
  hero: "#0f172a",
};

const shadow = "0 4 14 0 rgba(15,23,42,0.03)";

function esc(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function svg(children, { width = W, height = H, title = "WeMove" } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <title>${esc(title)}</title>
  <defs>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="7" flood-color="rgba(15,23,42,0.03)"/>
    </filter>
    <linearGradient id="primaryButton" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="heroOverlay" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10213e"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="${c.bg}"/>
  ${children.join("\n")}
</svg>`;
}

function rect(x, y, w, h, opts = {}) {
  const {
    fill = c.surface,
    stroke = c.line,
    strokeWidth = 1,
    rx = 18,
    filter = "",
    opacity = 1,
  } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${filter ? `filter="${filter}"` : ""}/>`;
}

function line(x1, y1, x2, y2, opts = {}) {
  const { stroke = c.line, strokeWidth = 1 } = opts;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function text(x, y, value, opts = {}) {
  const {
    size = 16,
    weight = 500,
    fill = c.text,
    anchor = "start",
    letterSpacing = "0",
    opacity = 1,
  } = opts;
  const lines = String(value).split("\n");
  const lineHeight = Math.round(size * 1.35);
  return `<text x="${x}" y="${y}" font-family="Pretendard, Apple SD Gothic Neo, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letterSpacing}" opacity="${opacity}">${lines
    .map((lineValue, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(lineValue)}</tspan>`)
    .join("")}</text>`;
}

function button(x, y, w, h, label, primary = false) {
  return [
    rect(x, y, w, h, {
      fill: primary ? "url(#primaryButton)" : c.surface,
      stroke: primary ? "#2563eb" : c.line,
      rx: 12,
    }),
    text(x + w / 2, y + h / 2 + 6, label, {
      size: 15,
      weight: 700,
      fill: primary ? "#ffffff" : c.text,
      anchor: "middle",
    }),
  ].join("\n");
}

function input(x, y, w, h, label, value = "") {
  return [
    label ? text(x, y - 10, label, { size: 13, weight: 700, fill: c.sub }) : "",
    rect(x, y, w, h, { fill: "#ffffff", stroke: c.line, rx: 12 }),
    value ? text(x + 16, y + h / 2 + 6, value, { size: 15, fill: c.muted }) : "",
  ].join("\n");
}

function chip(x, y, label, active = false, w = null) {
  const width = w ?? Math.max(54, label.length * 14 + 18);
  return [
    rect(x, y, width, 34, {
      fill: active ? c.blueSoft : c.surface,
      stroke: active ? "#bfdbfe" : c.line,
      rx: 999,
    }),
    text(x + width / 2, y + 22, label, {
      size: 13,
      weight: 700,
      fill: active ? c.blue : c.sub,
      anchor: "middle",
    }),
  ].join("\n");
}

function badge(x, y, label, tone = "default") {
  const tones = {
    default: { fill: c.surfaceSoft, text: "#374151" },
    sport: { fill: c.blueSoft, text: c.blue },
    green: { fill: c.green, text: c.greenText },
    orange: { fill: c.orange, text: c.orangeText },
    red: { fill: c.red, text: c.redText },
  };
  const toneData = tones[tone];
  const width = Math.max(56, label.length * 12 + 18);
  return [
    rect(x, y, width, 28, {
      fill: toneData.fill,
      stroke: "transparent",
      rx: 999,
    }),
    text(x + width / 2, y + 19, label, {
      size: 12,
      weight: 700,
      fill: toneData.text,
      anchor: "middle",
    }),
  ].join("\n");
}

function iconCircle(x, y, label, active = false) {
  return [
    rect(x, y, 34, 34, {
      fill: active ? c.blue : "#f3f4f6",
      stroke: active ? c.blue : "transparent",
      rx: 17,
    }),
    text(x + 17, y + 22, label, {
      size: 14,
      weight: 800,
      anchor: "middle",
      fill: active ? "#fff" : c.sub,
    }),
  ].join("\n");
}

function header() {
  return `
    ${rect(24, 24, 1552, 72, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" })}
    ${iconCircle(40, 43, "W", true)}
    ${text(88, 68, "WeMove", { size: 26, weight: 800 })}
    ${rect(192, 41, 1162, 48, { fill: "#fbfbfb", stroke: c.line, rx: 16 })}
    ${text(240, 71, "모임, 지역, 운동 종목 검색", { size: 14, fill: c.muted })}
    ${button(1388, 41, 94, 48, "로그인", false)}
    ${button(1490, 41, 86, 48, "회원가입", true)}
  `;
}

function sidebar(active = "홈") {
  const items = ["홈", "모임찾기", "내활동", "마이페이지"];
  let y = 140;
  const parts = [
    rect(24, 116, 190, 560, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }),
  ];
  for (const item of items) {
    const isActive = item === active;
    parts.push(rect(40, y, 158, 42, { fill: isActive ? c.blueSoft : "transparent", stroke: isActive ? "#dbeafe" : "transparent", rx: 14 }));
    parts.push(text(84, y + 27, item, { size: 15, weight: isActive ? 700 : 600, fill: c.text }));
    parts.push(iconCircle(54, y + 4, "•", isActive));
    y += 50;
  }
  parts.push(rect(40, 430, 158, 220, { fill: c.surfaceSoft, stroke: c.line, rx: 18 }));
  parts.push(text(58, 458, "관심 운동", { size: 14, weight: 700, fill: c.sub }));
  ["러닝", "헬스", "풋살", "등산", "배드민턴"].forEach((label, index) => {
    const yy = 474 + index * 36;
    parts.push(iconCircle(56, yy, "•", false));
    parts.push(text(94, yy + 22, label, { size: 14, weight: 600, fill: c.sub }));
  });
  return parts.join("\n");
}

function rightPanelTitle(x, y, title, link = "") {
  return `
    ${line(x, y - 6, x, y + 18, { stroke: c.blue, strokeWidth: 4 })}
    ${text(x + 16, y + 12, title, { size: 18, weight: 800 })}
    ${link ? text(x + 250, y + 12, link, { size: 13, weight: 700, fill: c.muted }) : ""}
  `;
}

function rightPanelCard(x, y, w, h, title, bodyRows) {
  const parts = [rect(x, y, w, h, { fill: c.surface, stroke: c.line, rx: 18, filter: "url(#cardShadow)" })];
  parts.push(rightPanelTitle(x + 18, y + 22, title));
  let yy = y + 58;
  bodyRows.forEach((row, idx) => {
    parts.push(text(x + 24, yy + 18, row.left, { size: 14, weight: 700, fill: c.sub }));
    parts.push(text(x + w - 24, yy + 18, row.right, { size: 14, weight: 700, fill: c.text, anchor: "end" }));
    if (row.sub) parts.push(text(x + 24, yy + 42, row.sub, { size: 13, fill: c.muted }));
    if (idx < bodyRows.length - 1) parts.push(line(x + 24, yy + 56, x + w - 24, yy + 56, { stroke: "#f1f3f5" }));
    yy += row.sub ? 70 : 56;
  });
  return parts.join("\n");
}

function localStatusCard(x, y) {
  return `
    ${rect(x, y, 270, 220, { fill: c.surface, stroke: c.line, rx: 18, filter: "url(#cardShadow)" })}
    ${text(x + 18, y + 28, "우리 동네 현황", { size: 16, weight: 800, fill: c.sub })}
    ${text(x + 252, y + 28, "경기 파주시 운정동", { size: 13, weight: 700, fill: c.muted, anchor: "end" })}
    ${rect(x + 18, y + 58, 110, 78, { fill: c.surfaceSoft, stroke: c.line, rx: 16 })}
    ${rect(x + 142, y + 58, 110, 78, { fill: c.surfaceSoft, stroke: c.line, rx: 16 })}
    ${rect(x + 18, y + 146, 110, 58, { fill: c.surfaceSoft, stroke: c.line, rx: 16 })}
    ${rect(x + 142, y + 146, 110, 58, { fill: c.surfaceSoft, stroke: c.line, rx: 16 })}
    ${text(x + 36, y + 92, "모집중 모임", { size: 12, weight: 700, fill: c.sub })}
    ${text(x + 36, y + 120, "24개", { size: 20, weight: 800 })}
    ${text(x + 160, y + 92, "참여 예정 인원", { size: 12, weight: 700, fill: c.sub })}
    ${text(x + 160, y + 120, "128명", { size: 20, weight: 800 })}
    ${text(x + 36, y + 176, "오늘 진행 모임", { size: 12, weight: 700, fill: c.sub })}
    ${text(x + 36, y + 197, "5개", { size: 18, weight: 800 })}
    ${text(x + 160, y + 176, "신규 댓글", { size: 12, weight: 700, fill: c.sub })}
    ${text(x + 160, y + 197, "43개", { size: 18, weight: 800 })}
  `;
}

function meetingCard(x, y, w, { title, sport, status, desc, place, time, capacity, host, compact = false }) {
  const h = compact ? 158 : 174;
  return `
    ${rect(x, y, w, h, { fill: c.surface, stroke: c.line, rx: 18, filter: "url(#cardShadow)" })}
    ${rect(x + 20, y + 20, 180, compact ? 118 : 126, { fill: "#eef2f7", stroke: c.line, rx: 16 })}
    ${badge(x + 220, y + 20, sport, "sport")}
    ${badge(x + 286, y + 20, status, status === "모집중" ? "green" : "orange")}
    ${text(x + 220, y + 70, title, { size: 22, weight: 800 })}
    ${text(x + 220, y + 102, desc, { size: 14, fill: c.sub })}
    ${text(x + 220, y + 134, `${place}   ·   ${time}   ·   ${capacity}`, { size: 13, fill: c.muted })}
    ${text(x + 220, y + 160, `${host}   ·   매너점수 4.8`, { size: 13, fill: c.muted })}
    ${button(x + w - 104, y + h - 56, 84, 40, "참가 신청", true)}
    ${rect(x + w - 242, y + h - 56, 40, 40, { fill: c.surface, stroke: c.line, rx: 12 })}
    ${rect(x + w - 196, y + h - 56, 40, 40, { fill: c.surface, stroke: c.line, rx: 12 })}
    ${rect(x + w - 150, y + h - 56, 40, 40, { fill: c.surface, stroke: c.line, rx: 12 })}
  `;
}

function homePage() {
  const parts = [header(), sidebar("홈")];
  parts.push(rect(232, 116, 800, 300, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(rect(252, 136, 760, 260, { fill: "url(#heroOverlay)", stroke: "transparent", rx: 20 }));
  parts.push(text(284, 180, "LOCAL FITNESS COMMUNITY", { size: 14, weight: 700, fill: "#dbeafe" }));
  parts.push(text(284, 244, "이번 주말엔 새로운 크루와\n같이 운동할 사람을 찾아보세요", { size: 30, weight: 800, fill: "#ffffff", letterSpacing: "-0.03em" }));
  parts.push(text(284, 320, "관심 운동과 지역을 고르면 지금 참여 가능한 모임을 바로 볼 수 있어요.", { size: 15, fill: "#dbeafe" }));
  parts.push(rect(284, 342, 560, 60, { fill: "rgba(255,255,255,0.16)", stroke: "rgba(255,255,255,0.24)", rx: 18 }));
  parts.push(rect(294, 352, 228, 40, { fill: "#ffffff", stroke: "transparent", rx: 12 }));
  parts.push(rect(530, 352, 190, 40, { fill: "#ffffff", stroke: "transparent", rx: 12 }));
  parts.push(rect(728, 352, 116, 40, { fill: "#ffffff", stroke: "transparent", rx: 12 }));
  parts.push(button(852, 352, 120, 40, "모임 찾기", true));
  parts.push(localStatusCard(1048, 116));
  parts.push(rightPanelCard(1336, 116, 240, 268, "실시간 인기모임", [
    { left: "1", right: "야당역 5km 러닝 크루", sub: "18" },
    { left: "2", right: "운정 풋살장 저녁 경기", sub: "14" },
    { left: "3", right: "헬린이 루틴 공유", sub: "10" },
  ]));
  parts.push(rightPanelCard(1336, 402, 240, 210, "이번 주 일정", [
    { left: "오늘 20:00", right: "야당역 러닝 모임" },
    { left: "내일 07:00", right: "운정 헬스 모임" },
    { left: "토 18:00", right: "배드민턴 정기 모임" },
    { left: "일 18:00", right: "풋살 매치" },
  ]));
  parts.push(rightPanelCard(1336, 630, 240, 160, "최근 활동", [
    { left: "러너지니님", right: "5분 전", sub: "댓글을 남겼어요." },
    { left: "헬린이탈출님", right: "15분 전", sub: "모임을 생성했어요." },
  ]));
  parts.push(rect(232, 432, 800, 88, { fill: c.surface, stroke: c.line, rx: 18, filter: "url(#cardShadow)" }));
  const cats = ["전체", "러닝", "헬스", "풋살", "배드민턴", "농구", "등산", "라이딩", "요가", "테니스"];
  let cx = 248;
  cats.forEach((cat, idx) => {
    parts.push(rect(cx, 446, 70, 60, { fill: "#ffffff", stroke: c.line, rx: 16 }));
    parts.push(iconCircle(cx + 18, 456, "•", idx === 0));
    parts.push(text(cx + 35, 492, cat, { size: 12, weight: 700, anchor: "middle" }));
    cx += 78;
  });
  parts.push(text(232, 560, "오늘의 추천 모임", { size: 26, weight: 800 }));
  ["전체", "모집중", "마감임박", "초보 환영", "정기 모임"].forEach((label, idx) => {
    parts.push(chip(232 + idx * 74, 586, label, idx === 0));
  });
  parts.push(meetingCard(232, 636, 1040, {
    title: "야당역 5km 러닝 크루 모집",
    sport: "러닝",
    status: "모집중",
    desc: "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다. 초보자도 맞출 수 있는 페이스로 진행합니다.",
    place: "야당역 2번 출구",
    time: "오늘 20:00",
    capacity: "6 / 10명",
    host: "러너민수",
  }));
  parts.push(meetingCard(232, 826, 1040, {
    title: "운정 풋살장 토요일 저녁 경기",
    sport: "풋살",
    status: "모집중",
    desc: "친목 위주 풋살 경기입니다. 실력보다 매너를 중요하게 보고 팀은 현장에서 나눕니다.",
    place: "운정 스포츠파크",
    time: "오늘 18:30",
    capacity: "8 / 10명",
    host: "풋살지훈",
  }));
  return svg(parts, { title: "WeMove 홈" });
}

function meetingListPage() {
  const parts = [header(), sidebar("모임찾기")];
  parts.push(text(240, 156, "모임 찾기", { size: 30, weight: 800 }));
  parts.push(text(240, 188, "지역과 운동 종목을 기준으로 지금 참여할 수 있는 모임을 빠르게 골라보세요.", { size: 15, fill: c.sub }));
  parts.push(rect(232, 216, 1072, 174, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(rect(232, 216, 1072, 174, { fill: "url(#heroOverlay)", stroke: "transparent", rx: 22, opacity: 0.96 }));
  parts.push(text(268, 286, "이번 주말, 동네에서 같이 운동할 사람을\n찾아보세요.", { size: 34, weight: 800, fill: "#ffffff", letterSpacing: "-0.03em" }));
  parts.push(text(268, 354, "운동 종목과 지역을 선택하면 모집 중인 모임을 빠르게 확인할 수 있습니다.", { size: 15, fill: "#dbeafe" }));
  parts.push(button(1180, 286, 96, 52, "모임 만들기", true));
  parts.push(rect(232, 414, 1072, 120, { fill: c.surface, stroke: c.line, rx: 18, filter: "url(#cardShadow)" }));
  let x = 252;
  ["전체", "러닝", "헬스", "풋살", "농구", "배드민턴", "등산", "기타"].forEach((label, idx) => {
    parts.push(chip(x, 434, label, idx === 0));
    x += label.length * 14 + 34;
  });
  parts.push(input(252, 490, 320, 48, "", "전체 지역"));
  parts.push(input(586, 490, 280, 48, "", "전체 상태"));
  parts.push(input(880, 490, 240, 48, "", "연도-월-일"));
  parts.push(input(1134, 490, 148, 48, "", "제목, 장소 검색"));
  parts.push(rightPanelCard(1328, 116, 248, 260, "인기 지역", [
    { left: "1. 운정동", right: "38개" },
    { left: "2. 야당동", right: "27개" },
    { left: "3. 금촌동", right: "19개" },
    { left: "4. 문산읍", right: "13개" },
  ]));
  parts.push(rightPanelCard(1328, 392, 248, 282, "이번 주 일정", [
    { left: "오늘 20:00", right: "야당역 러닝 크루 모집" },
    { left: "내일 18:30", right: "운정 풋살장 저녁 경기" },
    { left: "토 19:00", right: "헬린이 루틴 공유 모임" },
    { left: "일 14:00", right: "문산 실내체육관 배드민턴" },
  ]));
  parts.push(text(232, 600, "파주시 주변 모임", { size: 24, weight: 800 }));
  parts.push(text(1276, 600, "총 5개", { size: 14, weight: 700, fill: c.muted, anchor: "end" }));
  const data = [
    ["야당역 5km 러닝 크루 모집", "러닝", "모집중", "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다. 초보자도 맞출 수 있는 페이스로 진행합니다.", "경기 파주시 야당동", "05.16 20:00", "6 / 10명", "러너민수"],
    ["운정 풋살장 토요일 저녁 경기", "풋살", "모집중", "친목 위주 풋살 경기입니다. 실력보다 매너를 중요하게 보고 팀은 현장에서 나눕니다.", "운정 스포츠파크", "05.17 18:30", "8 / 10명", "풋살지훈"],
    ["헬린이 루틴 공유 모임", "헬스", "모집중", "운동 루틴과 식단을 편하게 나누는 소규모 모임입니다. PT 경험 없어도 편하게 오세요.", "금촌동 피트니스 센터", "05.18 19:00", "3 / 5명", "헬스유진"],
  ];
  data.forEach((row, idx) => {
    parts.push(meetingCard(232, 636 + idx * 188, 1040, {
      title: row[0],
      sport: row[1],
      status: row[2],
      desc: row[3],
      place: row[4],
      time: row[5],
      capacity: row[6],
      host: row[7],
    }));
  });
  return svg(parts, { height: 1260, title: "WeMove 모임찾기" });
}

function meetingDetailPage() {
  const parts = [header()];
  parts.push(rect(60, 128, 980, 840, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(rect(80, 148, 940, 280, { fill: "url(#heroOverlay)", stroke: "transparent", rx: 18 }));
  parts.push(badge(88, 442, "러닝", "sport"));
  parts.push(badge(154, 442, "모집중", "green"));
  parts.push(text(80, 502, "야당역 5km 러닝 크루 모집", { size: 34, weight: 800 }));
  parts.push(text(80, 542, "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다. 초보자도 맞출 수 있는 페이스로 진행합니다.", { size: 16, fill: c.sub }));
  [["장소", "야당역 2번 출구"], ["날짜", "2026.05.16"], ["시간", "20:00"], ["인원", "6 / 10명"]].forEach((item, idx) => {
    const xx = 80 + idx * 230;
    parts.push(rect(xx, 582, 210, 86, { fill: c.surfaceSoft, stroke: c.line, rx: 16 }));
    parts.push(text(xx + 20, 614, item[0], { size: 13, weight: 700, fill: c.sub }));
    parts.push(text(xx + 20, 650, item[1], { size: 20, weight: 800 }));
  });
  parts.push(text(80, 722, "모임 정보", { size: 22, weight: 800 }));
  parts.push(rect(80, 744, 940, 188, { fill: c.surfaceSoft, stroke: c.line, rx: 18 }));
  parts.push(text(108, 786, "모임 방식", { size: 14, weight: 700, fill: c.sub }));
  parts.push(text(248, 786, "1회성 모임", { size: 15, weight: 600 }));
  parts.push(text(108, 830, "반복 방식", { size: 14, weight: 700, fill: c.sub }));
  parts.push(text(248, 830, "없음", { size: 15, weight: 600 }));
  parts.push(text(108, 874, "준비물", { size: 14, weight: 700, fill: c.sub }));
  parts.push(text(248, 874, "편한 운동복, 물, 개인 이어폰", { size: 15, weight: 600 }));
  parts.push(text(108, 918, "진행 안내", { size: 14, weight: 700, fill: c.sub }));
  parts.push(text(248, 918, "시작 10분 전 집결 권장", { size: 15, weight: 600 }));
  parts.push(rect(1080, 128, 460, 280, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(1110, 172, "참가 신청", { size: 22, weight: 800 }));
  parts.push(text(1110, 210, "모임장 승인 후 참가가 확정됩니다.", { size: 15, fill: c.sub }));
  parts.push(text(1110, 258, "장소", { size: 14, weight: 700, fill: c.sub }));
  parts.push(text(1170, 258, "야당역 2번 출구", { size: 14 }));
  parts.push(text(1110, 290, "시간", { size: 14, weight: 700, fill: c.sub }));
  parts.push(text(1170, 290, "2026.05.16 20:00", { size: 14 }));
  parts.push(text(1110, 322, "인원", { size: 14, weight: 700, fill: c.sub }));
  parts.push(text(1170, 322, "6 / 10명", { size: 14 }));
  parts.push(button(1110, 352, 120, 46, "참가 신청", true));
  parts.push(button(1240, 352, 102, 46, "수정", false));
  parts.push(button(1350, 352, 134, 46, "신청자 관리", false));
  parts.push(rect(1080, 430, 460, 220, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(1110, 470, "호스트 정보", { size: 20, weight: 800 }));
  parts.push(rect(1110, 494, 64, 64, { fill: "#f3f4f6", stroke: c.line, rx: 32 }));
  parts.push(text(1190, 524, "러너민수", { size: 18, weight: 700 }));
  parts.push(text(1190, 550, "매너점수 4.8 · 후기 18", { size: 14, fill: c.sub }));
  parts.push(rect(1080, 674, 460, 294, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(1110, 716, "댓글 및 문의", { size: 20, weight: 800 }));
  [0, 1].forEach((idx) => {
    const yy = 742 + idx * 72;
    parts.push(rect(1110, yy, 400, 56, { fill: c.surfaceSoft, stroke: c.line, rx: 14 }));
    parts.push(text(1128, yy + 22, idx === 0 ? "헬린이탈출님" : "배드민턴민지님", { size: 13, weight: 700, fill: c.sub }));
    parts.push(text(1128, yy + 42, idx === 0 ? "초보도 함께 뛰기 괜찮을까요?" : "주차 가능한가요?", { size: 14 }));
  });
  parts.push(input(1110, 894, 280, 46, "", "댓글이나 문의를 남겨보세요"));
  parts.push(button(1402, 894, 108, 46, "등록", true));
  return svg(parts, { title: "WeMove 모임상세" });
}

function formPage(titleLabel, buttonLabel) {
  const parts = [header(), sidebar("모임찾기")];
  parts.push(text(240, 154, titleLabel, { size: 30, weight: 800 }));
  parts.push(text(240, 188, "모임 정보를 차분하게 입력하고 바로 등록할 수 있게 구성된 폼입니다.", { size: 15, fill: c.sub }));
  parts.push(rect(232, 216, 854, 720, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(rect(1112, 216, 464, 260, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(1140, 256, "작성 가이드", { size: 22, weight: 800 }));
  ["제목은 운동 목적이 바로 보이게", "장소는 최대한 구체적으로", "준비물과 진행 안내는 빠짐없이", "초보 환영 여부를 명확하게 표시"].forEach((item, idx) => {
    parts.push(text(1140, 298 + idx * 44, `• ${item}`, { size: 15, fill: c.sub }));
  });
  parts.push(rect(260, 248, 230, 156, { fill: c.surfaceSoft, stroke: c.line, rx: 16 }));
  parts.push(text(318, 330, "대표 이미지 업로드", { size: 16, weight: 700, fill: c.sub, anchor: "middle" }));
  parts.push(input(518, 264, 540, 48, "모임 제목", "야당역 5km 러닝 크루 모집"));
  parts.push(input(518, 334, 258, 48, "운동 종목", "러닝"));
  parts.push(input(800, 334, 258, 48, "지역", "경기 파주시 운정동"));
  parts.push(input(260, 430, 384, 48, "장소명", "야당역 2번 출구"));
  parts.push(input(674, 430, 384, 48, "주소", "경기 파주시 야당동"));
  parts.push(input(260, 500, 250, 48, "날짜", "2026-05-16"));
  parts.push(input(528, 500, 250, 48, "시간", "20:00"));
  parts.push(input(796, 500, 262, 48, "최대 인원", "10명"));
  parts.push(input(260, 570, 384, 48, "모임 방식", "1회성 모임"));
  parts.push(input(674, 570, 384, 48, "반복 방식", "없음"));
  parts.push(input(260, 640, 798, 60, "준비물", "편한 운동복, 물, 개인 이어폰"));
  parts.push(input(260, 720, 798, 60, "진행 안내", "시작 10분 전 집결 권장"));
  parts.push(input(260, 800, 798, 92, "상세 내용", "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다. 초보자도 맞출 수 있는 페이스로 진행합니다."));
  parts.push(button(868, 912, 96, 48, buttonLabel, true));
  parts.push(button(972, 912, 86, 48, "취소", false));
  return svg(parts, { title: `WeMove ${titleLabel}` });
}

function meetingManagePage() {
  const parts = [header(), sidebar("내활동")];
  parts.push(text(240, 154, "신청자 관리", { size: 30, weight: 800 }));
  parts.push(rect(232, 202, 1344, 126, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(262, 246, "야당역 5km 러닝 크루 모집", { size: 24, weight: 800 }));
  parts.push(text(262, 278, "2026.05.16 · 야당역 2번 출구 · 최대 10명", { size: 15, fill: c.sub }));
  [["신청자 수", "8명"], ["승인 완료", "6명"], ["대기 중", "2명"], ["거절", "1명"]].forEach((item, idx) => {
    const xx = 760 + idx * 190;
    parts.push(rect(xx, 224, 170, 82, { fill: c.surfaceSoft, stroke: c.line, rx: 16 }));
    parts.push(text(xx + 20, 256, item[0], { size: 13, weight: 700, fill: c.sub }));
    parts.push(text(xx + 20, 286, item[1], { size: 22, weight: 800 }));
  });
  parts.push(rect(232, 352, 800, 542, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(262, 394, "신청자 목록", { size: 22, weight: 800 }));
  [0, 1, 2].forEach((idx) => {
    const yy = 424 + idx * 126;
    parts.push(rect(262, yy, 740, 100, { fill: c.surfaceSoft, stroke: c.line, rx: 16 }));
    parts.push(rect(286, yy + 18, 58, 58, { fill: "#f3f4f6", stroke: c.line, rx: 29 }));
    parts.push(text(364, yy + 42, ["헬린이탈출", "배드민턴민지", "런린이철수"][idx], { size: 17, weight: 700 }));
    parts.push(text(364, yy + 70, ["초보도 함께 뛰기 괜찮을까요?", "운동은 가볍게 즐기는 편입니다.", "퇴근 후 참여 가능합니다."][idx], { size: 14, fill: c.sub }));
    parts.push(badge(720, yy + 18, idx === 2 ? "대기" : "신청중", idx === 2 ? "orange" : "default"));
    parts.push(button(800, yy + 54, 88, 38, "승인", true));
    parts.push(button(898, yy + 54, 88, 38, "거절", false));
  });
  parts.push(rect(1060, 352, 516, 542, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(1090, 394, "승인된 참가자", { size: 22, weight: 800 }));
  [0, 1, 2].forEach((idx) => {
    const yy = 430 + idx * 88;
    parts.push(rect(1090, yy, 456, 66, { fill: c.surfaceSoft, stroke: c.line, rx: 16 }));
    parts.push(rect(1110, yy + 14, 38, 38, { fill: "#f3f4f6", stroke: c.line, rx: 19 }));
    parts.push(text(1164, yy + 38, ["러너준", "조깅소희", "야당철민"][idx], { size: 16, weight: 700 }));
    parts.push(text(1452, yy + 38, "승인됨", { size: 13, weight: 700, fill: c.greenText, anchor: "end" }));
  });
  parts.push(button(1270, 838, 136, 48, "모집 완료 처리", true));
  parts.push(button(1416, 838, 130, 48, "상세로 돌아가기", false));
  return svg(parts, { title: "WeMove 신청자관리" });
}

function myPage() {
  const parts = [header(), sidebar("마이페이지")];
  parts.push(text(240, 154, "마이페이지", { size: 30, weight: 800 }));
  parts.push(rect(232, 202, 1344, 170, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(rect(264, 238, 92, 92, { fill: "#f3f4f6", stroke: c.line, rx: 46 }));
  parts.push(text(384, 266, "러너민수", { size: 28, weight: 800 }));
  parts.push(text(384, 300, "경기 파주시 운정동 · 관심 운동 러닝, 헬스", { size: 15, fill: c.sub }));
  parts.push(button(1430, 252, 118, 44, "프로필 수정", false));
  [["만든 모임", "6"], ["신청한 모임", "12"], ["참여한 모임", "9"], ["후기 수", "18"]].forEach((item, idx) => {
    const xx = 384 + idx * 224;
    parts.push(rect(xx, 318, 200, 38, { fill: c.surfaceSoft, stroke: c.line, rx: 12 }));
    parts.push(text(xx + 18, 342, item[0], { size: 13, weight: 700, fill: c.sub }));
    parts.push(text(xx + 180, 342, item[1], { size: 18, weight: 800, anchor: "end" }));
  });
  ["내가 만든 모임", "신청한 모임", "참여한 모임"].forEach((label, idx) => {
    parts.push(chip(232 + idx * 122, 402, label, idx === 0, idx === 0 ? 110 : 102));
  });
  parts.push(meetingCard(232, 458, 1344, {
    title: "야당역 5km 러닝 크루 모집",
    sport: "러닝",
    status: "모집중",
    desc: "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다. 초보자도 맞출 수 있는 페이스로 진행합니다.",
    place: "야당역 2번 출구",
    time: "오늘 20:00",
    capacity: "6 / 10명",
    host: "내가 만든 모임",
  }));
  parts.push(meetingCard(232, 650, 1344, {
    title: "운정 풋살장 토요일 저녁 경기",
    sport: "풋살",
    status: "승인 완료",
    desc: "친목 위주 풋살 경기입니다. 실력보다 매너를 중요하게 보고 팀은 현장에서 나눕니다.",
    place: "운정 스포츠파크",
    time: "토요일 18:30",
    capacity: "8 / 10명",
    host: "신청한 모임",
  }));
  return svg(parts, { title: "WeMove 마이페이지" });
}

function activityPage() {
  const parts = [header(), sidebar("내활동")];
  parts.push(text(240, 154, "내 활동", { size: 30, weight: 800 }));
  parts.push(rect(232, 202, 1344, 118, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  [["참여 기록", "18"], ["작성 댓글", "24"], ["좋아요", "36"], ["완료 모임", "9"]].forEach((item, idx) => {
    const xx = 260 + idx * 320;
    parts.push(text(xx, 250, item[0], { size: 14, weight: 700, fill: c.sub }));
    parts.push(text(xx, 288, item[1], { size: 32, weight: 800 }));
  });
  parts.push(rect(232, 342, 520, 522, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(260, 384, "최근 활동", { size: 22, weight: 800 }));
  ["야당역 러닝 모임에 참가 신청했어요.", "헬린이 루틴 공유 모임에 댓글을 남겼어요.", "운정 풋살장 경기 신청이 승인되었어요.", "후기 작성이 가능한 모임이 생겼어요."].forEach((item, idx) => {
    const yy = 422 + idx * 92;
    parts.push(rect(260, yy, 464, 66, { fill: c.surfaceSoft, stroke: c.line, rx: 16 }));
    parts.push(text(284, yy + 28, item, { size: 15, weight: 700 }));
    parts.push(text(284, yy + 50, `${idx + 1}시간 전`, { size: 13, fill: c.muted }));
  });
  parts.push(rect(780, 342, 796, 522, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(808, 384, "참여 중인 모임", { size: 22, weight: 800 }));
  parts.push(meetingCard(808, 416, 740, {
    title: "야당역 5km 러닝 크루 모집",
    sport: "러닝",
    status: "참여중",
    desc: "퇴근 후 가볍게 뛰는 5km 러닝 모임입니다.",
    place: "야당역 2번 출구",
    time: "오늘 20:00",
    capacity: "6 / 10명",
    host: "러너민수",
    compact: true,
  }));
  parts.push(meetingCard(808, 590, 740, {
    title: "헬린이 루틴 공유 모임",
    sport: "헬스",
    status: "참여중",
    desc: "운동 루틴과 식단을 편하게 나누는 소규모 모임입니다.",
    place: "금촌동 피트니스 센터",
    time: "내일 19:00",
    capacity: "3 / 5명",
    host: "헬스유진",
    compact: true,
  }));
  return svg(parts, { title: "WeMove 내활동" });
}

function reviewPage() {
  const parts = [header(), sidebar("내활동")];
  parts.push(text(240, 154, "후기 작성 및 조회", { size: 30, weight: 800 }));
  parts.push(rect(232, 202, 640, 372, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(260, 242, "후기 작성", { size: 22, weight: 800 }));
  parts.push(input(260, 286, 584, 48, "모임 선택", "야당역 5km 러닝 크루 모집"));
  parts.push(text(260, 372, "별점 선택", { size: 13, weight: 700, fill: c.sub }));
  parts.push(text(260, 406, "★ ★ ★ ★ ☆", { size: 28, weight: 700, fill: "#f59e0b" }));
  parts.push(input(260, 438, 584, 92, "후기 내용", "초보자도 무리 없이 참여할 수 있었고 분위기가 정말 편안했어요."));
  parts.push(button(728, 548, 116, 46, "후기 등록", true));
  parts.push(rect(900, 202, 676, 662, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" }));
  parts.push(text(928, 242, "후기 목록", { size: 22, weight: 800 }));
  [0, 1, 2].forEach((idx) => {
    const yy = 276 + idx * 186;
    parts.push(rect(928, yy, 620, 158, { fill: c.surfaceSoft, stroke: c.line, rx: 18 }));
    parts.push(text(956, yy + 30, ["야당역 러닝 모임", "운정 풋살장 경기", "헬린이 루틴 공유"][idx], { size: 18, weight: 800 }));
    parts.push(text(956, yy + 58, ["러너지니 · ★★★★★", "풋살지훈 · ★★★★☆", "헬스유진 · ★★★★★"][idx], { size: 14, fill: c.sub }));
    parts.push(text(956, yy + 94, ["같이 뛰는 분위기가 좋아서 부담 없이 참여할 수 있었어요.", "실력보다 매너를 중요하게 보는 분위기가 정말 좋았습니다.", "식단과 루틴 이야기를 편하게 나눌 수 있어서 유익했어요."][idx], { size: 15, fill: c.sub }));
    parts.push(text(1488, yy + 130, ["2026.05.18", "2026.05.17", "2026.05.16"][idx], { size: 13, fill: c.muted, anchor: "end" }));
  });
  return svg(parts, { title: "WeMove 후기" });
}

function adminPage() {
  const parts = [header()];
  parts.push(text(60, 154, "관리자 페이지", { size: 30, weight: 800 }));
  [["회원 수", "1,284"], ["모임 수", "246"], ["신고 수", "18"], ["운동 종목 수", "12"]].forEach((item, idx) => {
    const xx = 60 + idx * 386;
    parts.push(rect(xx, 192, 350, 104, { fill: c.surface, stroke: c.line, rx: 20, filter: "url(#cardShadow)" }));
    parts.push(text(xx + 28, 232, item[0], { size: 14, weight: 700, fill: c.sub }));
    parts.push(text(xx + 28, 274, item[1], { size: 30, weight: 800 }));
  });
  ["회원 관리", "모임 관리", "신고 관리", "운동 종목 관리"].forEach((label, idx) => {
    parts.push(chip(60 + idx * 120, 324, label, idx === 0, 104));
  });
  const table = (x, y, w, h, title) => `
    ${rect(x, y, w, h, { fill: c.surface, stroke: c.line, rx: 22, filter: "url(#cardShadow)" })}
    ${text(x + 28, y + 42, title, { size: 22, weight: 800 })}
    ${rect(x + 28, y + 66, w - 56, 44, { fill: c.surfaceSoft, stroke: c.line, rx: 12 })}
    ${text(x + 46, y + 94, "아이디", { size: 13, weight: 700, fill: c.sub })}
    ${text(x + 240, y + 94, "이름", { size: 13, weight: 700, fill: c.sub })}
    ${text(x + 420, y + 94, "상태", { size: 13, weight: 700, fill: c.sub })}
    ${text(x + w - 60, y + 94, "관리", { size: 13, weight: 700, fill: c.sub, anchor: "end" })}
    ${[0,1,2].map((idx)=>{
      const yy=y+124+idx*68;
      return `
        ${line(x + 28, yy, x + w - 28, yy, { stroke: "#f1f3f5" })}
        ${text(x + 46, yy + 28, ["user01","runner23","admin01"][idx], { size: 14 })}
        ${text(x + 240, yy + 28, ["러너민수","헬린이탈출","관리자"][idx], { size: 14 })}
        ${text(x + 420, yy + 28, idx===2?"관리자":"활성", { size: 14, fill: idx===2?c.blue:c.sub })}
        ${button(x + w - 132, yy + 6, 88, 34, "상세", false)}
      `;
    }).join("")}
  `;
  parts.push(table(60, 372, 730, 292, "회원 관리"));
  parts.push(table(818, 372, 730, 292, "모임 관리"));
  parts.push(table(60, 692, 730, 292, "신고 관리"));
  parts.push(table(818, 692, 730, 292, "운동 종목 관리"));
  return svg(parts, { title: "WeMove 관리자" });
}

function authBrand(x, y, title, desc, metrics) {
  const parts = [
    iconCircle(x, y, "W", true),
    text(x + 52, y + 26, "WeMove", { size: 24, weight: 800, fill: "#ffffff" }),
    rect(x, y + 46, 300, 46, { fill: "rgba(255,255,255,0.16)", stroke: "rgba(255,255,255,0.18)", rx: 18 }),
    text(x + 20, y + 76, title, { size: 15, weight: 800, fill: "#ffffff", letterSpacing: "0.08em" }),
    text(x, y + 140, desc, { size: 34, weight: 800, fill: "#ffffff", letterSpacing: "-0.04em" }),
    text(x, y + 260, "가까운 사람들과 함께 운동 루틴을 만들고, 모임을 찾고, 참여하고,\n관리할 수 있는 지역 기반 운동 플랫폼입니다.", { size: 15, fill: "#e5eefb" }),
  ];
  metrics.forEach((metric, idx) => {
    const yy = y + 332 + idx * 104;
    parts.push(rect(x, yy, 240, 84, { fill: "rgba(255,255,255,0.18)", stroke: "rgba(255,255,255,0.14)", rx: 20 }));
    parts.push(text(x + 20, yy + 34, metric.value, { size: 24, weight: 800, fill: "#ffffff" }));
    parts.push(text(x + 20, yy + 60, metric.label, { size: 14, fill: "#e5eefb" }));
  });
  return parts.join("\n");
}

function authBase(cardTitle, fields, footerLinks, findMode = false) {
  const parts = [
    rect(0, 0, W, H, { fill: "#0f172a", stroke: "transparent", rx: 0 }),
    rect(0, 0, W, H, { fill: "url(#heroOverlay)", stroke: "transparent", rx: 0, opacity: 0.52 }),
    authBrand(210, 180, findMode ? "ACCOUNT SUPPORT" : cardTitle === "회원가입" ? "JOIN WEMOVE" : "LOCAL FITNESS COMMUNITY", findMode ? "아이디와 비밀번호를 빠르게\n다시 찾는 방법" : cardTitle === "회원가입" ? "내 지역과 관심 운동으로\n시작하는 새로운 루틴" : "동네 운동이 더\n자연스럽게 이어지는 방식", findMode ? [
      { value: "이메일 인증", label: "안전한 진행" },
      { value: "아이디 조회", label: "계정 확인" },
      { value: "비밀번호 재설정", label: "링크 발송" },
    ] : cardTitle === "회원가입" ? [
      { value: "러닝", label: "출근 전부터 퇴근 후까지" },
      { value: "풋살", label: "팀이 없어도 가볍게" },
      { value: "등산", label: "주말 루틴까지 자연스럽게" },
    ] : [
      { value: "328+", label: "활성 모임" },
      { value: "8.9K", label: "누적 참여" },
      { value: "4.8", label: "평균 만족도" },
    ]),
    rect(622, 170, 432, findMode ? 504 : cardTitle === "회원가입" ? 612 : 458, { fill: "rgba(255,255,255,0.96)", stroke: "#e5e7eb", rx: 28, filter: "url(#cardShadow)" }),
    badge(662, 200, cardTitle, "sport"),
    text(662, 260, findMode ? "계정 정보가 기억나지 않아도\n안전하게 다시 연결할 수 있어요" : cardTitle === "회원가입" ? "프로필을 만들고 바로 시작하세요" : "오늘은 누구와 같이 움직여볼까요?", { size: 26, weight: 800 }),
    text(662, findMode ? 332 : 318, findMode ? "가입한 이메일과 기본 정보만 확인하면 안전하게 다시 연결할 수 있습니다." : cardTitle === "회원가입" ? "기본 정보와 관심 운동만 입력하면 WeMove 활동 준비가 끝납니다." : "로그인하고 내 주변 운동 모임을 바로 확인해보세요.", { size: 15, fill: c.sub }),
  ];
  let y = findMode ? 380 : 360;
  fields.forEach((row) => {
    if (row.type === "tabs") {
      parts.push(chip(662, y, "아이디 찾기", row.active === "id", 110));
      parts.push(chip(780, y, "비밀번호 재설정", row.active === "pw", 148));
      y += 62;
      return;
    }
    if (row.type === "double") {
      parts.push(input(662, y, 180, 48, row.left.label, row.left.value));
      parts.push(input(858, y, 180, 48, row.right.label, row.right.value));
      y += 76;
      return;
    }
    if (row.type === "inputButton") {
      parts.push(input(662, y, 286, 48, row.label, row.value));
      parts.push(button(960, y + 22, 78, 48, row.button, true));
      y += 76;
      return;
    }
    parts.push(input(662, y, 376, 48, row.label, row.value));
    y += 76;
  });
  parts.push(button(662, y + 8, 376, 54, footerLinks.primary, true));
  parts.push(text(850, y + 102, footerLinks.secondary, { size: 14, fill: c.sub, anchor: "middle" }));
  if (footerLinks.third) parts.push(text(940, y + 102, `· ${footerLinks.third}`, { size: 14, fill: c.sub, anchor: "middle" }));
  return svg(parts, { title: `WeMove ${cardTitle}` });
}

function loginPage() {
  return authBase("로그인", [
    { label: "아이디 또는 이메일", value: "user01" },
    { label: "비밀번호", value: "••••" },
  ], { primary: "로그인", secondary: "회원가입", third: "아이디/비밀번호 찾기" });
}

function signupPage() {
  return authBase("회원가입", [
    { type: "inputButton", label: "아이디", value: "wemove_runner", button: "중복확인" },
    { type: "inputButton", label: "이메일", value: "runner@wemove.kr", button: "인증" },
    { type: "double", left: { label: "비밀번호", value: "비밀번호 입력" }, right: { label: "비밀번호 확인", value: "비밀번호 다시 입력" } },
    { type: "double", left: { label: "닉네임", value: "러너민수" }, right: { label: "지역", value: "경기 파주시 운정동" } },
    { label: "관심 운동 종목", value: "러닝, 헬스, 풋살" },
  ], { primary: "가입 완료", secondary: "이미 계정이 있어요" });
}

function findAccountPage() {
  return authBase("계정 찾기", [
    { type: "tabs", active: "id" },
    { label: "이름 또는 닉네임", value: "러너민수" },
    { type: "inputButton", label: "가입 이메일", value: "runner@wemove.kr", button: "인증" },
    { label: "인증번호", value: "123456" },
    { label: "결과 안내", value: "가입된 아이디: wemove_runner" },
  ], { primary: "아이디 확인", secondary: "로그인으로 돌아가기", third: "회원가입" }, true);
}

const pages = {
  "01-home.svg": homePage,
  "02-meeting-list.svg": meetingListPage,
  "03-meeting-detail.svg": meetingDetailPage,
  "04-meeting-create.svg": () => formPage("모임 만들기", "등록"),
  "05-meeting-edit.svg": () => formPage("모임 수정", "수정 완료"),
  "06-meeting-manage.svg": meetingManagePage,
  "07-activity.svg": activityPage,
  "08-my-page.svg": myPage,
  "09-review.svg": reviewPage,
  "10-admin.svg": adminPage,
  "11-login.svg": loginPage,
  "12-signup.svg": signupPage,
  "13-find-account.svg": findAccountPage,
};

Object.entries(pages).forEach(([file, create]) => {
  fs.writeFileSync(path.join(outDir, file), create(), "utf8");
});

const indexLinks = Object.keys(pages)
  .map(
    (file) => `<div class="card"><img src="./${file}" alt="${file}"/><p>${file}</p></div>`,
  )
  .join("");

fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>WeMove Figma Wireframes</title>
  <style>
    body { margin:0; padding:24px; background:#f3f4f6; font-family:Pretendard, sans-serif; }
    h1 { margin:0 0 20px; font-size:28px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:20px; }
    .card { background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:16px; box-shadow:0 4px 14px rgba(15,23,42,0.03); }
    .card img { width:100%; border:1px solid #e5e7eb; border-radius:12px; display:block; }
    .card p { margin:12px 0 0; font-size:14px; color:#4b5563; font-weight:700; }
  </style>
</head>
<body>
  <h1>WeMove Figma용 SVG 시안</h1>
  <div class="grid">${indexLinks}</div>
</body>
</html>`,
  "utf8",
);

console.log(`Generated ${Object.keys(pages).length} SVG wireframes in ${outDir}`);
