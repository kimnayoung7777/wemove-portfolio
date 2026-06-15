import { useEffect, useRef, useState } from "react";
import { KAKAO_MAP_APP_KEY, loadKakaoMap } from "../utils/kakaoMap";
import defaultThumbnail from "../assets/image/bg1.jpg";
import styles from "../styles/MeetingMap.module.css";
import UiIcon from "./UiIcon";

const SEOUL_CENTER = { latitude: 37.5665, longitude: 126.978 };
const coordinateCache = new Map();
const markerImageCache = new Map();
const GEOCODING_CONCURRENCY = 6;

const getAddressCandidates = (meeting) =>
  [
    meeting.address,
    [meeting.regionName, meeting.placeName].filter(Boolean).join(" "),
    meeting.regionName,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const geocodeAddress = (geocoder, candidates) =>
  new Promise((resolve) => {
    const searchNext = (index) => {
      const address = candidates[index];
      if (!address) {
        resolve(null);
        return;
      }

      const cached = coordinateCache.get(address);
      if (cached) {
        resolve(cached);
        return;
      }

      geocoder.addressSearch(address, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          const coordinate = {
            latitude: Number(result[0].y),
            longitude: Number(result[0].x),
          };
          coordinateCache.set(address, coordinate);
          resolve(coordinate);
          return;
        }

        searchNext(index + 1);
      });
    };

    searchNext(0);
  });

const getCoordinate = async (meeting, geocoder) => {
  const latitude = Number(meeting.latitude);
  const longitude = Number(meeting.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  return geocodeAddress(geocoder, getAddressCandidates(meeting));
};

const loadMarkerThumbnail = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });

const drawCoverImage = (context, image, size) => {
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  context.drawImage(
    image,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );
};

const createMarkerImage = async (kakao, meeting) => {
  const thumbnailSource = meeting.thumbnailImage || defaultThumbnail;

  if (!markerImageCache.has(thumbnailSource)) {
    markerImageCache.set(
      thumbnailSource,
      (async () => {
        let image;

        try {
          image = await loadMarkerThumbnail(thumbnailSource);
        } catch {
          image = await loadMarkerThumbnail(defaultThumbnail);
        }

        const pixelRatio = 2;
        const markerWidth = 58;
        const markerHeight = 68;
        const center = 29;
        const imageSize = 44;
        const canvas = document.createElement("canvas");
        canvas.width = markerWidth * pixelRatio;
        canvas.height = markerHeight * pixelRatio;

        const context = canvas.getContext("2d");
        context.scale(pixelRatio, pixelRatio);

        context.save();
        context.shadowColor = "rgba(15, 23, 42, 0.28)";
        context.shadowBlur = 8;
        context.shadowOffsetY = 4;
        context.fillStyle = "#2563eb";
        context.beginPath();
        context.moveTo(center - 8, 51);
        context.lineTo(center, 65);
        context.lineTo(center + 8, 51);
        context.closePath();
        context.fill();
        context.beginPath();
        context.arc(center, center, 27, 0, Math.PI * 2);
        context.fill();
        context.restore();

        context.save();
        context.beginPath();
        context.arc(center, center, imageSize / 2, 0, Math.PI * 2);
        context.clip();
        context.translate(center - imageSize / 2, center - imageSize / 2);
        drawCoverImage(context, image, imageSize);
        context.restore();

        context.beginPath();
        context.arc(center, center, imageSize / 2, 0, Math.PI * 2);
        context.strokeStyle = "#fff";
        context.lineWidth = 3;
        context.stroke();

        return canvas.toDataURL("image/png");
      })(),
    );
  }

  const markerSource = await markerImageCache.get(thumbnailSource);
  return new kakao.maps.MarkerImage(
    markerSource,
    new kakao.maps.Size(58, 68),
    { offset: new kakao.maps.Point(29, 65) },
  );
};

const createPopup = (meeting, onSelectMeeting, onClose) => {
  const popup = document.createElement("article");
  popup.className = styles.popup;
  ["click", "mousedown", "pointerdown", "touchstart", "wheel"].forEach(
    (eventName) => {
      popup.addEventListener(eventName, (event) => event.stopPropagation());
    },
  );

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = styles.popupClose;
  closeButton.setAttribute("aria-label", "모임 정보창 닫기");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onClose?.();
  });

  const summary = document.createElement("div");
  summary.className = styles.popupSummary;

  const thumbnail = document.createElement("img");
  thumbnail.className = styles.popupThumbnail;
  thumbnail.src = meeting.thumbnailImage || defaultThumbnail;
  thumbnail.alt = "";
  thumbnail.addEventListener(
    "error",
    () => {
      thumbnail.src = defaultThumbnail;
    },
    { once: true },
  );

  const summaryBody = document.createElement("div");
  summaryBody.className = styles.popupSummaryBody;

  const head = document.createElement("div");
  head.className = styles.popupHead;

  const sport = document.createElement("span");
  sport.className = styles.popupSport;
  sport.textContent = meeting.sportName || "운동 모임";

  const status = document.createElement("span");
  status.className = styles.popupStatus;
  status.textContent =
    meeting.status === "RECRUITING" ? "모집중" : "일정 확인";

  const title = document.createElement("strong");
  title.className = styles.popupTitle;
  title.textContent = meeting.title || "모임 상세";
  title.title = meeting.title || "모임 상세";

  const schedule = document.createElement("p");
  const startTime = String(meeting.startTime || "").slice(0, 5);
  const endTime = String(meeting.endTime || "").slice(0, 5);
  const nextDayText = endTime && endTime < startTime ? "다음 날 " : "";
  schedule.textContent = [
    meeting.meetingDate,
    startTime && endTime
      ? `${startTime} ~ ${nextDayText}${endTime}`
      : startTime || endTime,
  ]
    .filter(Boolean)
    .join(" ");

  const place = document.createElement("small");
  place.textContent =
    meeting.placeName || meeting.address || meeting.regionName || "";
  place.title =
    meeting.placeName || meeting.address || meeting.regionName || "";

  const button = document.createElement("button");
  button.type = "button";
  button.className = styles.popupDetail;
  button.textContent = "상세 보기";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectMeeting?.(meeting.meetingId ?? meeting.id);
  });

  head.append(sport, status);
  summaryBody.append(head, title, schedule, place);
  summary.append(thumbnail, summaryBody);
  popup.append(closeButton, summary, button);
  return popup;
};

export default function MeetingMap({
  meetings,
  onSelectMeeting,
  initialAddress,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const infoOverlayRef = useRef(null);
  const [mapStatus, setMapStatus] = useState(
    KAKAO_MAP_APP_KEY ? "loading" : "missing-key",
  );
  const [mappedCount, setMappedCount] = useState(0);

  useEffect(() => {
    let active = true;

    loadKakaoMap()
      .then((kakao) => {
        if (!active || !mapElementRef.current) {
          return;
        }

        mapRef.current = new kakao.maps.Map(mapElementRef.current, {
          center: new kakao.maps.LatLng(
            SEOUL_CENTER.latitude,
            SEOUL_CENTER.longitude,
          ),
          level: 8,
        });
        clustererRef.current = new kakao.maps.MarkerClusterer({
          map: mapRef.current,
          averageCenter: true,
          minLevel: 6,
          disableClickZoom: false,
          styles: [
            {
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #60a5fa)",
              color: "#fff",
              textAlign: "center",
              lineHeight: "42px",
              fontSize: "13px",
              fontWeight: "900",
              boxShadow: "0 8px 20px rgba(37, 99, 235, .3)",
            },
          ],
        });
        setMapStatus("ready");
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setMapStatus(
          error.message === "KAKAO_MAP_APP_KEY_MISSING"
            ? "missing-key"
            : "error",
        );
      });

    return () => {
      active = false;
      infoOverlayRef.current?.setMap(null);
      clustererRef.current?.clear();
      mapRef.current = null;
      clustererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || !clustererRef.current) {
      return undefined;
    }

    let active = true;
    const eventListeners = [];
    const kakao = window.kakao;
    const map = mapRef.current;
    const geocoder = new kakao.maps.services.Geocoder();
    const closeInfoOverlay = () => {
      infoOverlayRef.current?.setMap(null);
      infoOverlayRef.current = null;
    };
    const mapClickHandler = () => closeInfoOverlay();

    kakao.maps.event.addListener(map, "click", mapClickHandler);

    const renderMarkers = async () => {
      clustererRef.current.clear();
      infoOverlayRef.current?.setMap(null);
      setMappedCount(0);

      const positionedMeetings = [];
      let nextMeetingIndex = 0;
      const geocodeWorker = async () => {
        while (nextMeetingIndex < meetings.length) {
          const meetingIndex = nextMeetingIndex;
          nextMeetingIndex += 1;
          const meeting = meetings[meetingIndex];
          const coordinate = await getCoordinate(meeting, geocoder);

          if (coordinate) {
            positionedMeetings.push({
              meeting,
              coordinate,
              meetingIndex,
            });
          }
        }
      };

      await Promise.all(
        Array.from(
          { length: Math.min(GEOCODING_CONCURRENCY, meetings.length) },
          geocodeWorker,
        ),
      );
      positionedMeetings.sort(
        (left, right) => left.meetingIndex - right.meetingIndex,
      );

      if (!active || !mapRef.current || !clustererRef.current) {
        return;
      }

      const bounds = new kakao.maps.LatLngBounds();
      const markers = await Promise.all(positionedMeetings.map(async ({ meeting, coordinate }) => {
        const position = new kakao.maps.LatLng(
          coordinate.latitude,
          coordinate.longitude,
        );
        const marker = new kakao.maps.Marker({
          position,
          image: await createMarkerImage(kakao, meeting),
          title: meeting.title,
        });
        const clickHandler = () => {
          closeInfoOverlay();
          infoOverlayRef.current = new kakao.maps.CustomOverlay({
            map: mapRef.current,
            position,
            content: createPopup(
              meeting,
              onSelectMeeting,
              closeInfoOverlay,
            ),
            xAnchor: 0.5,
            yAnchor: 1.35,
            zIndex: 10,
            clickable: true,
          });
          mapRef.current.panTo(position);
        };

        kakao.maps.event.addListener(marker, "click", clickHandler);
        eventListeners.push({ marker, clickHandler });
        bounds.extend(position);
        return marker;
      }));

      if (!active || !mapRef.current || !clustererRef.current) {
        return;
      }

      clustererRef.current.addMarkers(markers);
      setMappedCount(markers.length);

      const initialCoordinate = initialAddress
        ? await geocodeAddress(geocoder, [initialAddress])
        : null;

      if (!active || !mapRef.current) {
        return;
      }

      if (initialCoordinate) {
        mapRef.current.setCenter(
          new kakao.maps.LatLng(
            initialCoordinate.latitude,
            initialCoordinate.longitude,
          ),
        );
        mapRef.current.setLevel(6);
      } else if (markers.length === 1) {
        mapRef.current.setCenter(markers[0].getPosition());
        mapRef.current.setLevel(5);
      } else if (markers.length > 1) {
        mapRef.current.setBounds(bounds, 56, 56, 56, 56);
      }
    };

    renderMarkers();

    return () => {
      active = false;
      eventListeners.forEach(({ marker, clickHandler }) => {
        kakao.maps.event.removeListener(marker, "click", clickHandler);
      });
      kakao.maps.event.removeListener(map, "click", mapClickHandler);
      closeInfoOverlay();
    };
  }, [initialAddress, mapStatus, meetings, onSelectMeeting]);

  return (
    <section className={styles.mapCard}>
      <div className={styles.mapHead}>
        <div>
          <span className={styles.eyebrow}>MEETING MAP</span>
          <h2>지도에서 가까운 모임을 찾아보세요</h2>
          <p>마커를 누르면 장소와 일정을 확인하고 상세 페이지로 이동할 수 있습니다.</p>
        </div>
        <span className={styles.mapCount}>
          <UiIcon name="location" className={styles.mapCountIcon} />
          {mappedCount}/{meetings.length}개 표시
        </span>
      </div>

      <div className={styles.mapViewport}>
        <div ref={mapElementRef} className={styles.mapCanvas} />

        {mapStatus === "loading" ? (
          <div className={styles.mapState}>
            <span className={styles.spinner} />
            <strong>지도를 불러오는 중입니다</strong>
          </div>
        ) : null}

        {mapStatus === "missing-key" ? (
          <div className={styles.mapState}>
            <UiIcon name="location" className={styles.stateIcon} />
            <strong>카카오 지도 키 설정이 필요합니다</strong>
            <p>Vercel에 VITE_KAKAO_MAP_APP_KEY를 등록하면 실제 지도가 표시됩니다.</p>
          </div>
        ) : null}

        {mapStatus === "error" ? (
          <div className={styles.mapState}>
            <UiIcon name="location" className={styles.stateIcon} />
            <strong>지도를 불러오지 못했습니다</strong>
            <p>카카오 개발자 콘솔의 JavaScript 키와 웹 도메인을 확인해주세요.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
