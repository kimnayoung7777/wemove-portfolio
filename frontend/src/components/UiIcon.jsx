const iconProps = {
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export default function UiIcon({ name, className }) {
  const icons = {
    home: <path d="M3 10.5 12 4l9 6.5M5.5 9.5V20h13V9.5" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
      // 쓰레기통(삭제) 아이콘
      trash: (
          <>
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
          </>
      ),
        arrow: (
              <path d="M5 12h14M12 5l7 7-7 7" />
          ),
    activity: <path d="M4 12h3l2.4-5 4.2 10 2.6-5H20" />,
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19c1.7-3.2 4-4.8 7-4.8s5.3 1.6 7 4.8" />
      </>
    ),
    chevronDown: <path d="m7 10 5 5 5-5" />,
    location: (
      <>
        <path d="M12 20s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z" />
        <circle cx="12" cy="10" r="2.2" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3.8v3.4M17 3.8v3.4M4 8.5h16" />
        <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      </>
    ),
    spark: (
      <path d="M12 3.5 13.8 8l4.7 1.8-4.7 1.9-1.8 4.8-1.9-4.8L5.5 9.8 10.1 8 12 3.5Z" />
    ),
    heart: (
      <path d="M12 20.5s-7-4.3-7-10a4.2 4.2 0 0 1 7-3 4.2 4.2 0 0 1 7 3c0 5.7-7 10-7 10Z" />
    ),
    comment: (
      <path d="M5 18.2V6.8A1.8 1.8 0 0 1 6.8 5h10.4A1.8 1.8 0 0 1 19 6.8v7.4A1.8 1.8 0 0 1 17.2 16H9l-4 2.2Z" />
    ),
    share: (
      <>
        <circle cx="18" cy="5.5" r="2.5" />
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="18.5" r="2.5" />
        <path d="m8.2 11 7.4-4.2M8.2 13l7.4 4.2" />
      </>
    ),
    dumbbell: (
      <>
        <path d="M9 9v6M15 9v6M7 7v10M17 7v10M4.5 10v4M19.5 10v4M7 12h10" />
      </>
    ),
    soccer: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m12 8.2 2.6 1.8-1 3h-3.2l-1-3L12 8.2Z" />
      </>
    ),
    basketball: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17M3.5 12h17M6.8 6.8c2.4 2.4 2.4 8 0 10.4M17.2 6.8c-2.4 2.4-2.4 8 0 10.4" />
      </>
    ),
    badminton: (
      <>
        <path d="m7 8 6 6M14 7l3 3M8.5 16.5l-2 2" />
        <path d="M6.8 18.2c1.3-1.3 2-2.1 2.7-2.8M13 7l4.3-2" />
      </>
    ),
    mountain: <path d="m3.5 18 5.4-8 3.2 4.6 2.5-3.6 5.9 7H3.5Z" />,
    bike: (
      <>
        <circle cx="6.5" cy="16" r="3.2" />
        <circle cx="17.5" cy="16" r="3.2" />
        <path d="M10 16h4.5l-3.3-6H8.7M13.7 10H17l-1.5 2.5" />
      </>
    ),
    yoga: (
      <>
        <circle cx="12" cy="6.5" r="2.2" />
        <path d="M8.5 20c1.4-3.4 2.3-5.2 3.5-7.1M15.5 20c-1.1-3.2-1.8-5.1-3.5-7.1M7.5 12.5h9" />
      </>
    ),
    tennis: (
      <>
        <path d="M8 5.5a5.6 5.6 0 0 1 8 8" />
        <path d="M16 18.5a5.6 5.6 0 0 1-8-8" />
        <path d="m9 15 6-6" />
      </>
    ),
    running: (
      <>
        <circle cx="14" cy="5.5" r="2.2" />
        <path d="m10 20 2.2-5.2 2.8-2.3 2 2.4M9.5 12l3.4-1.3 2-3.2M12.2 9.8 9 9" />
      </>
    ),
    walking: (
      <>
        <circle cx="13" cy="5.5" r="2" />
        <path d="M11.5 8.5 9.8 13 7 20M12 11.5l3.5 2M11 14l4 6" />
      </>
    ),
    trail: (
      <>
        <path d="M3.5 18c2.8-3.5 5.4-3.5 8 0s5.2 3.5 9 0" />
        <path d="m6 14 3.5-5 2.4 3.3 1.8-2.6 4.3 5.3" />
      </>
    ),
    baseball: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.2 5.4c2 2.3 2 10.9 0 13.2M15.8 5.4c-2 2.3-2 10.9 0 13.2" />
        <path d="M7.9 9.2h1.8M7.8 12h1.8M7.9 14.8h1.8M14.3 9.2h1.8M14.4 12h1.8M14.3 14.8h1.8" />
      </>
    ),
    volleyball: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5c2.7 2.8 3.4 5.8 2 9M6 6.2c3.5.4 6.2 2.1 8 5M4.2 14.5c3.2-1.8 6.6-2.3 10.3-1.5" />
      </>
    ),
    ball: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M5.8 6.5c3.2 2.2 8.8 2.2 12.4 0M5.8 17.5c3.2-2.2 8.8-2.2 12.4 0" />
      </>
    ),
    handball: (
      <>
        <circle cx="9" cy="13" r="4" />
        <path d="M13.5 6.5 17 3M15 8.8l4.5-1M15.3 11.5l4.2 1.8M4.8 17.6 3 21M12.2 17.3 15 21" />
      </>
    ),
    rugby: (
      <>
        <path d="M4.2 15.8c1.5-5.7 7-10.1 15.6-7.6-1.5 5.7-7 10.1-15.6 7.6Z" />
        <path d="m7.5 14.4 9-5.3M10 8.4l5.1 8.1" />
      </>
    ),
    hockey: (
      <>
        <path d="M7 4v10.5c0 2 1.5 3.5 3.5 3.5H16" />
        <path d="M17 4v9.5c0 1.4-.9 2.5-2.2 2.5H12M15.5 20h4" />
      </>
    ),
    lacrosse: (
      <>
        <path d="M6 20 17.5 5.5" />
        <ellipse cx="18" cy="5" rx="2.5" ry="3.4" transform="rotate(35 18 5)" />
        <path d="M16.2 3.2 19.8 6.8M14 11l3 2" />
      </>
    ),
    tableTennis: (
      <>
        <circle cx="16.5" cy="7.5" r="2" />
        <path d="M5.2 17.8 13 10" />
        <circle cx="9" cy="14" r="4.2" />
      </>
    ),
    racket: (
      <>
        <ellipse cx="10" cy="8" rx="4.6" ry="6" transform="rotate(35 10 8)" />
        <path d="m13.2 12.5 6.2 6.2M8 4.5l5.5 5.5M5.5 8.2l5.2 5.2" />
      </>
    ),
    fitness: (
      <>
        <path d="M5 19c1.8-4.2 4.2-6.3 7-6.3s5.2 2.1 7 6.3" />
        <path d="M7 10.5h10M8.5 7.5h7M10 4.5h4" />
      </>
    ),
    stretch: (
      <>
        <circle cx="12" cy="5.5" r="2" />
        <path d="M6 20c2.4-3.6 4.2-6 6-8.5M18 20c-2.4-3.6-4.2-6-6-8.5M5 12h14" />
      </>
    ),
    pilates: (
      <>
        <circle cx="12" cy="5.3" r="2" />
        <path d="M4 17.5c4.2-2.3 11.8-2.3 16 0M7 13.8l5-3.2 5 3.2M9 20h6" />
      </>
    ),
    climbing: (
      <>
        <path d="M17.5 3.5 20 20H5l3.5-8 3 3 2-5 2.5 2.2" />
        <circle cx="12.5" cy="5.5" r="1.8" />
      </>
    ),
    boxing: (
      <>
        <path d="M8 5h5.5A4.5 4.5 0 0 1 18 9.5V13a4 4 0 0 1-4 4H8V5Z" />
        <path d="M8 9H5.5A2.5 2.5 0 0 0 3 11.5V17h5M11 17v3" />
      </>
    ),
    martialArts: (
      <>
        <circle cx="12" cy="5.5" r="2" />
        <path d="m5 11 7-2 7 2M12 9v5M7 20l5-6 5 6M8.5 14h7" />
      </>
    ),
    fencing: (
      <>
        <path d="M4 18 19.5 4.5M5 15l4 4M8 18l-2 2M14.5 6.5l3 3" />
        <circle cx="6.5" cy="16.5" r="2.5" />
      </>
    ),
    swimming: (
      <>
        <path d="M4 16c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 2.5 1 3.5.4" />
        <path d="M4 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 2.5 1 3.5.4" />
        <circle cx="15" cy="7" r="2" />
        <path d="m8 13 5-4 4 3" />
      </>
    ),
    diving: (
      <>
        <path d="M4 17c2-1 4-1 6 0s4 1 6 0 3.5-.8 4.5-.2" />
        <path d="m7 9 4 2 4-5M11 11l4 3M15 6l4 2" />
        <circle cx="6" cy="7" r="1.6" />
      </>
    ),
    surfing: (
      <>
        <path d="M3.5 17c3.5-3.8 7-3.8 10.5 0 2 2.1 4.3 2.2 6.5.2" />
        <path d="M7 19c3.5-5.8 7.8-8 13-6.5" />
      </>
    ),
    kayak: (
      <>
        <path d="M3.5 15.5c4.2 2.5 12.8 2.5 17 0" />
        <path d="m6 12 12 3M6 18l12-3M4 7l16 4" />
      </>
    ),
    rowing: (
      <>
        <path d="M4 16c4 2 12 2 16 0M6 13h9l3 3M9 13l-3-4M14 13l3-4" />
        <circle cx="12" cy="8" r="1.8" />
      </>
    ),
    paddleBoard: (
      <>
        <path d="M4 18c4.5 1.7 11.5 1.7 16 0M7 15h10M12 5v10M9 7l6 6" />
      </>
    ),
    sailing: (
      <>
        <path d="M5 19h14M8 16h8l-4-12v12M12 4 6.5 16M12 4l6 12" />
      </>
    ),
    waterSki: (
      <>
        <path d="M4 18c4 1.5 12 1.5 16 0M7 15l5-4 5 4M9 20h9" />
        <circle cx="12" cy="7" r="1.8" />
      </>
    ),
    wakeboard: (
      <>
        <path d="M4 18c4.5 1.7 11.5 1.7 16 0M7 15l10-3M8 11l4-4 4 2" />
        <circle cx="12" cy="5" r="1.6" />
      </>
    ),
    ski: (
      <>
        <path d="M5 20c4-1.2 10-1.2 14 0M8 5l2.5 9M16 5l-2.5 9M6 14l4.5.8M18 14l-4.5.8" />
      </>
    ),
    snowboard: (
      <>
        <path d="M5 18c3.8 1.8 10.2 1.8 14 0M8 13l8 2M10 9l4-3 3 4" />
        <circle cx="12" cy="4" r="1.5" />
      </>
    ),
    skate: (
      <>
        <path d="M7 15h8.5c1.8 0 3-1 3.5-2.5M6 18h12" />
        <circle cx="8" cy="20" r="1" />
        <circle cx="16" cy="20" r="1" />
      </>
    ),
    curling: (
      <>
        <path d="M9 8h6M11 5h2M7 12h10l1.5 5h-13L7 12Z" />
        <path d="M6 20h12" />
      </>
    ),
    sled: (
      <>
        <path d="M7 9v5h9V9M5 17h13.5c1.4 0 2.3-.5 2.8-1.5M7 17v3M16 17v3" />
      </>
    ),
    skateboard: (
      <>
        <path d="M5 15c4.2 2.2 9.8 2.2 14 0" />
        <circle cx="8" cy="18" r="1.2" />
        <circle cx="16" cy="18" r="1.2" />
      </>
    ),
    scooter: (
      <>
        <path d="M8 17h7c2 0 3.5-1.5 3.5-3.5V5M16 5h4" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="18" cy="18" r="1.8" />
      </>
    ),
    parkour: (
      <>
        <circle cx="12" cy="5" r="1.8" />
        <path d="m6 13 6-4 5 3M9 20l3-6 5 6M4 16h5" />
      </>
    ),
    horse: (
      <>
        <path d="M5 17V9l4-3h5l5 4v7M8 17v3M16 17v3M9 9h5l2 3" />
      </>
    ),
    archery: (
      <>
        <path d="M5 4c4 4 4 12 0 16M5 12h15M16 8l4 4-4 4" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1.5" />
      </>
    ),
    bowling: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="10" cy="8" r="0.8" />
        <circle cx="13" cy="8" r="0.8" />
        <circle cx="11.5" cy="10.7" r="0.8" />
      </>
    ),
    billiards: (
      <>
        <circle cx="9" cy="13" r="4.5" />
        <circle cx="16.5" cy="8" r="2.5" />
        <path d="M13 16.5 20 21M4 4l16 16" />
      </>
    ),
    golf: (
      <>
        <path d="M8 20h8M12 20V4l6 2.5-6 2.5" />
        <circle cx="17" cy="18" r="1" />
      </>
    ),
    frisbee: (
      <>
        <ellipse cx="12" cy="13" rx="8" ry="3.2" />
        <path d="M5 13c3.5 1.6 10.5 1.6 14 0" />
      </>
    ),
    dance: (
      <>
        <circle cx="12" cy="5.5" r="2" />
        <path d="M6 13c2.4-3 4.4-4 6-3s3.6 2 6 3M9 20l3-7 3 7" />
      </>
    ),
    ballet: (
      <>
        <circle cx="12" cy="5" r="1.8" />
        <path d="M8 11h8M10 20l2-9 2 9M7 20h4M13 20h4M9 8l3 3 3-3" />
      </>
    ),
    aerobics: (
      <>
        <circle cx="12" cy="5.5" r="2" />
        <path d="M5 12h14M8 20l4-8 4 8M8 8l4 4 4-4" />
      </>
    ),
    gymnastics: (
      <>
        <circle cx="12" cy="5.5" r="2" />
        <path d="M5 14c3-3.2 5.4-4.8 7-4.8S16 10.8 19 14M8 20h8" />
      </>
    ),
    trampoline: (
      <>
        <ellipse cx="12" cy="17" rx="7.5" ry="2.5" />
        <path d="M7 19.5V22M17 19.5V22M9 8l3-4 3 4M12 4v9" />
      </>
    ),
    triathlon: (
      <>
        <path d="M4 18h16M5 14c2-2 4-2 6 0s4 2 6 0" />
        <circle cx="7" cy="8" r="2" />
        <path d="M12 9h4l2 3M10 10l2 4" />
      </>
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m15.5 8.5-2.2 5-4.8 2 2.2-5 4.8-2Z" />
      </>
    ),
    cricket: (
      <>
        <path d="M6 20 17 9M15 5l4 4M4 15l5 5" />
        <circle cx="18" cy="18" r="1.5" />
      </>
    ),
    gateball: (
      <>
        <path d="M5 19V8h6v11M13 19V8h6v11M4 19h16" />
        <circle cx="12" cy="16" r="1.3" />
      </>
    ),
    floorball: (
      <>
        <path d="M6 4v10c0 2 1.3 3 3.2 3H17M17 4v10" />
        <circle cx="18.5" cy="18.5" r="1.5" />
      </>
    ),
    cheer: (
      <>
        <circle cx="12" cy="6" r="2" />
        <path d="M5 11h14M8 20l4-8 4 8M4 8l3 3M20 8l-3 3" />
      </>
    ),
    esports: (
      <>
        <rect x="4" y="8" width="16" height="9" rx="4" />
        <path d="M8 12h4M10 10v4M16 12h.1M18 14h.1" />
      </>
    ),
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    refresh: (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),
  };

  return (
    <svg className={className} {...iconProps}>
      {icons[name] ?? icons.spark}
    </svg>
  );
}
