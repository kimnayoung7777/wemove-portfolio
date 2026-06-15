import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createChatMessage,
  createDirectChatMessage,
  createDirectChatRoom,
  getChatMessages,
  getChatRooms,
  getDirectChatMessages,
  getDirectChatRooms,
  leaveDirectChatRoom,
  leaveMeetingChatRoom,
} from "../api/chatApi";
import {
  broadcastNotice,
  getNoticeNotifications,
  getNotifications,
} from "../api/notificationApi";
import defaultUserImage from "../assets/image/Default-user.png";
import { buildWsUrl } from "../config/env";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import UserProfileDetailModal from "./UserProfileDetailModal";
import { getAccessToken } from "../utils/authTokenStore";
import {
  NOTIFICATION_TYPES,
  WEMOVE_NOTIFICATION_OPEN_EVENT,
} from "../utils/notificationEvents";
import { WEMOVE_DIRECT_CHAT_OPEN_EVENT } from "../utils/directChatEvents";
import styles from "../styles/GlobalMeetingChat.module.css";

const stickerModules = import.meta.glob("../stickers/wemoveticker/*.{png,PNG}", {
  eager: true,
  import: "default",
  query: "?url",
});

const WEMOVE_STICKER_MESSAGE_PATTERN = /^::wemove-sticker:([^:]+)::$/;

const wemoveStickers = Object.entries(stickerModules)
  .map(([path, src]) => {
    const fileName = path.split("/").pop();
    const name = fileName.replace(/\.[^.]+$/, "");

    return {
      id: encodeURIComponent(name),
      aliases: [
        encodeURIComponent(name),
        encodeURIComponent(fileName),
        name,
        fileName,
      ],
      name,
      src,
    };
  })
  .sort((left, right) =>
    left.name.localeCompare(right.name, "ko", {
      numeric: true,
      sensitivity: "base",
    }),
  );

const stickerMap = new Map(
  wemoveStickers.flatMap((sticker) =>
    sticker.aliases.map((alias) => [alias, sticker]),
  ),
);

const createStickerContent = (sticker) => `::wemove-sticker:${sticker.id}::`;

const getStickerFromContent = (content) => {
  const match = String(content || "").match(WEMOVE_STICKER_MESSAGE_PATTERN);

  if (!match) {
    return null;
  }

  return stickerMap.get(match[1]) || null;
};

const getChatPreview = (content, fallback = "") =>
  getStickerFromContent(content) ? "이모티콘을 보냈습니다." : content || fallback;

const formatTime = (value) => {
  if (!value) {
    return "";
  }

  const normalizedValue = String(value).replace("T", " ");
  const timeMatch = normalizedValue.match(/\b(\d{2}):(\d{2})/);

  if (!timeMatch) {
    return "";
  }

  const [, hourValue, minute] = timeMatch;
  const hour = Number(hourValue);

  if (Number.isNaN(hour)) {
    return "";
  }

  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;

  return `${period} ${displayHour}:${minute}`;
};

const getDateKey = (value) => {
  if (!value) {
    return "";
  }

  return String(value).replace("T", " ").slice(0, 10);
};

const formatDateLabel = (value) => {
  const dateKey = getDateKey(value);
  if (!dateKey) {
    return "";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const weekdays = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];

  return `${year}년 ${month}월 ${day}일 ${weekdays[date.getDay()]}`;
};

const formatSchedule = (meetingDate, startTime) =>
  [meetingDate, startTime ? String(startTime).slice(0, 5) : ""]
    .filter(Boolean)
    .join(" ");

const getRoomActivityTime = (room) => {
  const value =
    room?.lastMessageAt ||
    (room?.meetingDate && room?.startTime
      ? `${room.meetingDate}T${String(room.startTime).slice(0, 8)}`
      : room?.meetingDate);
  const time = value ? new Date(String(value).replace(" ", "T")).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
};

const sortRoomsByLatestMessage = (roomList) =>
  [...roomList].sort((a, b) => {
    const timeDiff = getRoomActivityTime(b) - getRoomActivityTime(a);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (
      Number(b.meetingId || b.roomId || 0) -
      Number(a.meetingId || a.roomId || 0)
    );
  });

const mergeMessagesById = (...messageGroups) => {
  const messageMap = new Map();

  messageGroups.flat().forEach((message) => {
    if (message?.messageId) {
      messageMap.set(Number(message.messageId), message);
    }
  });

  return [...messageMap.values()].sort((a, b) => {
    const timeA = a?.createdAt
      ? new Date(String(a.createdAt).replace(" ", "T")).getTime()
      : 0;
    const timeB = b?.createdAt
      ? new Date(String(b.createdAt).replace(" ", "T")).getTime()
      : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return Number(a.messageId || 0) - Number(b.messageId || 0);
  });
};

const PANEL_DEFAULT_WIDTH = 860;
const PANEL_DEFAULT_HEIGHT = 560;
const PANEL_MIN_WIDTH = 520;
const PANEL_MIN_HEIGHT = 360;
const MOVE_TALK_FALLBACK_TITLE = "무브톡";
const CHAT_PARTICIPANT_FALLBACK = "참가자";
const NOTIFICATION_TEST_COMMAND = "noti";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function GlobalMeetingChat() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [panelSize, setPanelSize] = useState(null);
  const [roomsCollapsed, setRoomsCollapsed] = useState(false);
  const [sidebarMode, setSidebarMode] = useState("ROOMS");
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const messageInputRef = useRef(null);
  const socketMapRef = useRef(new Map());
  const openRef = useRef(false);
  const chatTypeRef = useRef("GROUP");
  const selectedMeetingIdRef = useRef(null);
  const selectedDirectRoomIdRef = useRef(null);
  const roomsRef = useRef([]);
  const directRoomsRef = useRef([]);
  const userIdRef = useRef(null);
  const latestMessageIdsRef = useRef(new Set());
  const [chatType, setChatType] = useState("GROUP");
  const [directRooms, setDirectRooms] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [selectedDirectRoomId, setSelectedDirectRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [noticeMessages, setNoticeMessages] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState(null);
  const [roomMenu, setRoomMenu] = useState(null);
  const directSocketMapRef = useRef(new Map());
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const selectedMeetingRoom = useMemo(
    () =>
      rooms.find(
        (room) => Number(room.meetingId) === Number(selectedMeetingId),
      ) ?? null,
    [rooms, selectedMeetingId],
  );
  const selectedDirectRoom = useMemo(
    () =>
      directRooms.find(
        (room) => Number(room.roomId) === Number(selectedDirectRoomId),
      ) ?? null,
    [directRooms, selectedDirectRoomId],
  );
  const selectedRoom =
    chatType === "GROUP" ? selectedMeetingRoom : selectedDirectRoom;
  const isNoticeMode = chatType === "NOTICE";
  const isStickerMode = sidebarMode === "STICKERS";

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    directRoomsRef.current = directRooms;
  }, [directRooms]);

  useEffect(() => {
    userIdRef.current = user?.memberId ?? null;
  }, [user?.memberId]);

  useEffect(() => {
    chatTypeRef.current = chatType;
  }, [chatType]);

  useEffect(() => {
    selectedMeetingIdRef.current = selectedMeetingId;
  }, [selectedMeetingId]);

  useEffect(() => {
    selectedDirectRoomIdRef.current = selectedDirectRoomId;
  }, [selectedDirectRoomId]);

  const activeRoomId =
    chatType === "GROUP"
      ? selectedMeetingId
      : chatType === "PRIVATE"
        ? selectedDirectRoomId
        : null;

  const loadNoticeMessages = useCallback(async () => {
    if (!isAuthenticated) {
      setNoticeMessages([]);
      return;
    }

    setLoadingNotices(true);
    setError("");

    try {
      let response;
      try {
        response = await getNoticeNotifications();
      } catch (noticeRequestError) {
        response = await getNotifications();
      }
      const { data } = response;
      const nextNotices = Array.isArray(data)
        ? data
            .filter((notification) => notification.type === "notice")
            .map((notification) => ({
              notificationId:
                notification.notificationId || notification.id || notification.createdAt,
              title: notification.title || "공지사항",
              message: notification.message || "",
              createdAt: notification.createdAt,
            }))
            .sort((left, right) => {
              const leftTime = left.createdAt
                ? new Date(String(left.createdAt).replace(" ", "T")).getTime()
                : 0;
              const rightTime = right.createdAt
                ? new Date(String(right.createdAt).replace(" ", "T")).getTime()
                : 0;
              return leftTime - rightTime;
            })
        : [];
      setNoticeMessages(nextNotices);
    } catch (requestError) {
      setNoticeMessages([]);
      setError(
        requestError?.response?.data?.message ||
          "공지사항을 불러오지 못했습니다.",
      );
    } finally {
      setLoadingNotices(false);
    }
  }, [isAuthenticated]);

  const openNoticeCollection = useCallback(() => {
    setOpen(true);
    setChatType("NOTICE");
    setSelectedMeetingId(null);
    setSelectedDirectRoomId(null);
    loadNoticeMessages();
  }, [loadNoticeMessages]);

  const closeNoticeCollection = useCallback(() => {
    setChatType("GROUP");
  }, []);

  const openSelectedMeetingDetail = useCallback(() => {
    if (chatType !== "GROUP" || !selectedMeetingRoom?.meetingId) {
      return;
    }

    navigate(`/meetings/${selectedMeetingRoom.meetingId}`);
  }, [chatType, navigate, selectedMeetingRoom?.meetingId]);

  const appendMessage = useCallback(
    (message, options = {}) => {
      if (!message?.messageId) {
        return;
      }

      const messageKey = `meeting:${message.messageId}`;
      if (latestMessageIdsRef.current.has(messageKey)) {
        return;
      }

      latestMessageIdsRef.current.add(messageKey);

      if (
        chatTypeRef.current === "GROUP" &&
        Number(message.meetingId) === Number(selectedMeetingIdRef.current)
      ) {
        setMessages((current) => mergeMessagesById(current, [message]));
      }

      setRooms((current) =>
        sortRoomsByLatestMessage(
          current.map((room) =>
            Number(room.meetingId) === Number(message.meetingId)
              ? {
                  ...room,
                  lastMessageId: message.messageId,
                  lastMessage: message.content,
                  lastMessageAt: message.createdAt,
                }
              : room,
          ),
        ),
      );

      const isMine = Number(message.userId) === Number(userIdRef.current);
      const shouldNotify =
        !isMine &&
        options.notify !== false &&
        (!openRef.current ||
          chatTypeRef.current !== "GROUP" ||
          Number(selectedMeetingIdRef.current) !== Number(message.meetingId));

      if (shouldNotify) {
        const roomTitle =
          roomsRef.current.find(
            (room) => Number(room.meetingId) === Number(message.meetingId),
          )?.title || MOVE_TALK_FALLBACK_TITLE;
        const notificationMessage = `${
          message.nickname || CHAT_PARTICIPANT_FALLBACK
        }: ${getChatPreview(message.content)}`;
        const notificationPayload = {
          type: NOTIFICATION_TYPES.CHAT,
          chatKind: "MEETING",
          title: roomTitle,
          message: notificationMessage,
          sourceId: message.meetingId,
          createdAt: message.createdAt,
        };

        toast.info(roomTitle, notificationMessage, {
          sourceId: `chat:${message.meetingId || roomTitle}`,
          target: notificationPayload,
        });
      }
    },
    [toast],
  );

  const appendDirectMessage = useCallback(
    (message, options = {}) => {
      if (!message?.messageId) {
        return;
      }

      const messageKey = `direct:${message.messageId}`;
      if (latestMessageIdsRef.current.has(messageKey)) {
        return;
      }

      latestMessageIdsRef.current.add(messageKey);

      if (
        chatTypeRef.current === "PRIVATE" &&
        Number(message.roomId) === Number(selectedDirectRoomIdRef.current)
      ) {
        setMessages((current) => mergeMessagesById(current, [message]));
      }

      setDirectRooms((current) =>
        sortRoomsByLatestMessage(
          current.map((room) =>
            Number(room.roomId) === Number(message.roomId)
              ? {
                  ...room,
                  lastMessageId: message.messageId,
                  lastMessage: message.content,
                  lastMessageAt: message.createdAt,
                }
              : room,
          ),
        ),
      );

      const isMine = Number(message.userId) === Number(userIdRef.current);
      const shouldNotify =
        !isMine &&
        options.notify !== false &&
        (!openRef.current ||
          chatTypeRef.current !== "PRIVATE" ||
          Number(selectedDirectRoomIdRef.current) !== Number(message.roomId));

      if (shouldNotify) {
        const roomTitle =
          directRoomsRef.current.find(
            (room) => Number(room.roomId) === Number(message.roomId),
          )?.targetNickname || "1:1 대화";
        const notificationMessage = `${
          message.nickname || CHAT_PARTICIPANT_FALLBACK
        }: ${getChatPreview(message.content)}`;
        const notificationPayload = {
          type: NOTIFICATION_TYPES.CHAT,
          chatKind: "DIRECT",
          title: roomTitle,
          message: notificationMessage,
          sourceId: message.roomId,
          createdAt: message.createdAt,
        };

        toast.info(roomTitle, notificationMessage, {
          sourceId: `direct-chat:${message.roomId || roomTitle}`,
          target: notificationPayload,
        });
      }
    },
    [toast],
  );

  const publishTestNotification = useCallback(() => {
    const testMessage = "무브톡 알림 테스트 메시지입니다.";
    const notificationPayload = {
      type: NOTIFICATION_TYPES.CHAT,
      title: MOVE_TALK_FALLBACK_TITLE,
      message: testMessage,
      sourceId: "move-talk-test",
    };

    toast.info(MOVE_TALK_FALLBACK_TITLE, testMessage, {
      sourceId: "chat:move-talk-test",
      target: notificationPayload,
    });
  }, [toast]);

  const loadMeetingRooms = useCallback(async () => {
    if (isAdmin) {
      setRooms([]);
      setSelectedMeetingId(null);
      return;
    }

    if (!isAuthenticated) {
      setRooms([]);
      setSelectedMeetingId(null);
      return;
    }

    setLoadingRooms(true);
    setError("");

    try {
      const { data } = await getChatRooms();
      const nextRooms = sortRoomsByLatestMessage(
        Array.isArray(data) ? data : [],
      );
      setRooms(nextRooms);
      setSelectedMeetingId((current) =>
        nextRooms.some((room) => Number(room.meetingId) === Number(current))
          ? current
          : null,
      );
    } catch (requestError) {
      setRooms([]);
      setSelectedMeetingId(null);
      setError(
        requestError?.response?.data?.message ||
          "무브톡 목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoadingRooms(false);
    }
  }, [isAdmin, isAuthenticated]);

  const loadDirectRooms = useCallback(async () => {
    if (isAdmin) {
      setDirectRooms([]);
      setSelectedDirectRoomId(null);
      return [];
    }

    if (!isAuthenticated) {
      setDirectRooms([]);
      setSelectedDirectRoomId(null);
      return [];
    }

    setLoadingRooms(true);
    setError("");

    try {
      const { data } = await getDirectChatRooms();
      const nextRooms = sortRoomsByLatestMessage(
        Array.isArray(data) ? data : [],
      );
      setDirectRooms(nextRooms);
      setSelectedDirectRoomId((current) =>
        nextRooms.some((room) => Number(room.roomId) === Number(current))
          ? current
          : null,
      );
      return nextRooms;
    } catch (requestError) {
      setDirectRooms([]);
      setSelectedDirectRoomId(null);
      setError(
        requestError?.response?.data?.message ||
          "1:1 대화 목록을 불러오지 못했습니다.",
      );
      return [];
    } finally {
      setLoadingRooms(false);
    }
  }, [isAdmin, isAuthenticated]);

  const openDirectRoomByTargetUser = useCallback(
    async (targetUserId) => {
      if (!isAuthenticated || !targetUserId) {
        return;
      }

      setOpen(true);
      setChatType("PRIVATE");
      setError("");

      try {
        const { data } = await createDirectChatRoom(targetUserId);

        const nextRooms = await loadDirectRooms();

        const createdRoom = data?.roomId
          ? data
          : nextRooms.find(
              (room) => Number(room.targetUserId) === Number(targetUserId),
            );

        if (!createdRoom?.roomId) {
          throw new Error("Direct chat room response does not include roomId.");
        }

        setDirectRooms((current) =>
          sortRoomsByLatestMessage([
            createdRoom,
            ...current.filter(
              (room) => Number(room.roomId) !== Number(createdRoom.roomId),
            ),
          ]),
        );
        setSelectedDirectRoomId(createdRoom.roomId);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          "1:1 대화를 시작하지 못했습니다.";
        setError(message);
        toast.error("1:1 대화", message);
      }
    },
    [isAuthenticated, loadDirectRooms, toast],
  );

  const openRoomMenu = useCallback(
    (event, type, room) => {
      event.preventDefault();
      event.stopPropagation();

      if (type === "GROUP" && Number(room?.hostUserId) === Number(user?.memberId)) {
        toast.info("모임톡", "모임장은 모임톡을 나갈 수 없습니다.");
        return;
      }

      setRoomMenu({
        type,
        room,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [toast, user?.memberId],
  );

  const closeRoomMenu = useCallback(() => {
    setRoomMenu(null);
  }, []);

  const leaveSelectedRoom = useCallback(async () => {
    if (!roomMenu?.room) {
      return;
    }

    const confirmed = window.confirm(
      "채팅방을 나가면 이전 대화는 복구할 수 없습니다. 정말 나가시겠습니까?",
    );
    if (!confirmed) {
      closeRoomMenu();
      return;
    }

    try {
      if (roomMenu.type === "GROUP") {
        const meetingId = roomMenu.room.meetingId;
        await leaveMeetingChatRoom(meetingId);
        setRooms((current) =>
          current.filter((room) => Number(room.meetingId) !== Number(meetingId)),
        );
        setSelectedMeetingId((current) =>
          Number(current) === Number(meetingId) ? null : current,
        );
      } else {
        const roomId = roomMenu.room.roomId;
        await leaveDirectChatRoom(roomId);
        setDirectRooms((current) =>
          current.filter((room) => Number(room.roomId) !== Number(roomId)),
        );
        setSelectedDirectRoomId((current) =>
          Number(current) === Number(roomId) ? null : current,
        );
      }
      setMessages([]);
      closeRoomMenu();
    } catch (requestError) {
      closeRoomMenu();
      toast.error(
        "채팅방 나가기 실패",
        requestError?.response?.data?.message || "채팅방을 나가지 못했습니다.",
      );
    }
  }, [closeRoomMenu, roomMenu, toast]);

  useEffect(() => {
    if (loading) {
      return;
    }

    loadMeetingRooms();
    loadDirectRooms();
  }, [
    isAuthenticated,
    loadMeetingRooms,
    loadDirectRooms,
    loading,
    user?.memberId,
  ]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!activeRoomId || !open) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoadingMessages(true);
    setError("");
    setMessages([]);
    latestMessageIdsRef.current.clear();

    const messageRequest =
      chatType === "GROUP"
        ? getChatMessages(activeRoomId)
        : getDirectChatMessages(activeRoomId);

    messageRequest
      .then(({ data }) => {
        if (!active) {
          return;
        }

        const nextMessages = Array.isArray(data) ? data : [];
        nextMessages.forEach((message) => {
          if (message?.messageId) {
            latestMessageIdsRef.current.add(
              `${chatType === "GROUP" ? "meeting" : "direct"}:${message.messageId}`,
            );
          }
        });
        setMessages((current) => mergeMessagesById(nextMessages, current));
      })
      .catch((requestError) => {
        if (active) {
          setMessages([]);
          setError(
            requestError?.response?.data?.message ||
              "메시지를 불러오지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingMessages(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeRoomId, chatType, open]);

  useEffect(() => {
    if (isAdmin) {
      socketMapRef.current.forEach((socket) => socket.close());
      socketMapRef.current.clear();
      return undefined;
    }

    if (!isAuthenticated || !rooms.length) {
      socketMapRef.current.forEach((socket) => socket.close());
      socketMapRef.current.clear();
      return undefined;
    }

    const token = getAccessToken();
    if (!token) {
      return undefined;
    }

    const visibleMeetingIds = new Set(
      rooms.map((room) => Number(room.meetingId)).filter(Boolean),
    );

    socketMapRef.current.forEach((socket, meetingId) => {
      if (!visibleMeetingIds.has(meetingId)) {
        socket.close();
        socketMapRef.current.delete(meetingId);
      }
    });

    rooms.forEach((room) => {
      const meetingId = Number(room.meetingId);
      if (!meetingId || socketMapRef.current.has(meetingId)) {
        return;
      }

      const socket = new WebSocket(
        buildWsUrl("/meeting-chat", { meetingId, token }),
      );

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "CHAT_MESSAGE_CREATED") {
            appendMessage(payload.message);
          }
        } catch {
          // 채팅 메시지가 아니면 무시합니다.
        }
      };

      socket.onclose = () => {
        socketMapRef.current.delete(meetingId);
      };

      socketMapRef.current.set(meetingId, socket);
    });

    return undefined;
  }, [appendMessage, isAdmin, isAuthenticated, rooms, user?.memberId]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!roomMenu) {
      return undefined;
    }

    const closeOnPointerDown = () => {
      setRoomMenu(null);
    };

    window.addEventListener("pointerdown", closeOnPointerDown);
    return () => window.removeEventListener("pointerdown", closeOnPointerDown);
  }, [roomMenu]);

  useEffect(() => {
    if (!open || !isNoticeMode || loadingNotices || !listRef.current) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isNoticeMode, loadingNotices, noticeMessages, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const closeOnOutsidePointerDown = (event) => {
      if (profileModalUser) {
        return;
      }

      if (panelRef.current?.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
    };
  }, [open, profileModalUser]);

  useEffect(() => {
    if (isAdmin) {
      directSocketMapRef.current.forEach((socket) => socket.close());
      directSocketMapRef.current.clear();
      return undefined;
    }

    if (!isAuthenticated || !directRooms.length) {
      directSocketMapRef.current.forEach((socket) => socket.close());
      directSocketMapRef.current.clear();
      return undefined;
    }

    const token = getAccessToken();
    if (!token) {
      return undefined;
    }

    const visibleRoomIds = new Set(
      directRooms.map((room) => Number(room.roomId)).filter(Boolean),
    );
    directSocketMapRef.current.forEach((socket, roomId) => {
      if (!visibleRoomIds.has(roomId)) {
        socket.close();
        directSocketMapRef.current.delete(roomId);
      }
    });
    directRooms.forEach((room) => {
      const roomId = Number(room.roomId);
      if (!roomId || directSocketMapRef.current.has(roomId)) {
        return;
      }
      const socket = new WebSocket(
        buildWsUrl("/direct-chat", { roomId, token }),
      );

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "DIRECT_CHAT_MESSAGE_CREATED") {
            appendDirectMessage(payload.message);
          }
        } catch {
          // 1:1 채팅 메시지가 아니면 무시합니다.
        }
      };
      socket.onclose = () => {
        directSocketMapRef.current.delete(roomId);
      };
      directSocketMapRef.current.set(roomId, socket);
    });

    return undefined;
  }, [
    appendDirectMessage,
    isAdmin,
    isAuthenticated,
    directRooms,
    user?.memberId,
  ]);

  useEffect(() => {
    if (!open || activeRoomId) {
      return undefined;
    }

    let commandBuffer = "";

    const handleNotificationTestCommand = (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.length !== 1
      ) {
        return;
      }

      commandBuffer = `${commandBuffer}${event.key.toLowerCase()}`.slice(
        -NOTIFICATION_TEST_COMMAND.length,
      );

      if (commandBuffer === NOTIFICATION_TEST_COMMAND) {
        publishTestNotification();
        commandBuffer = "";
      }
    };

    window.addEventListener("keydown", handleNotificationTestCommand);
    return () => {
      window.removeEventListener("keydown", handleNotificationTestCommand);
    };
  }, [activeRoomId, open, publishTestNotification]);

  useEffect(() => {
    const handleOpenNotificationTarget = (event) => {
      const notification = event.detail;
      if (notification?.type !== NOTIFICATION_TYPES.CHAT) {
        return;
      }

      if (notification.chatKind === "DIRECT") {
        setOpen(true);
        setChatType("PRIVATE");
        setSelectedDirectRoomId(
          Number.isNaN(Number(notification.sourceId))
            ? notification.sourceId
            : Number(notification.sourceId),
        );
        loadDirectRooms();
        return;
      }

      const rawSourceId = String(notification.sourceId || "");
      const meetingId = rawSourceId.startsWith("chat:")
        ? rawSourceId.slice(5)
        : rawSourceId;

      if (!meetingId || meetingId === "move-talk-test") {
        setOpen(true);
        return;
      }

      setOpen(true);
      setChatType("GROUP");
      setSelectedMeetingId(
        Number.isNaN(Number(meetingId)) ? meetingId : Number(meetingId),
      );
    };

    window.addEventListener(
      WEMOVE_NOTIFICATION_OPEN_EVENT,
      handleOpenNotificationTarget,
    );
    return () => {
      window.removeEventListener(
        WEMOVE_NOTIFICATION_OPEN_EVENT,
        handleOpenNotificationTarget,
      );
    };
  }, [loadDirectRooms]);

  useEffect(() => {
    const handleDirectChatOpen = (event) => {
      openDirectRoomByTargetUser(event.detail?.targetUserId);
    };

    window.addEventListener(
      WEMOVE_DIRECT_CHAT_OPEN_EVENT,
      handleDirectChatOpen,
    );
    return () => {
      window.removeEventListener(
        WEMOVE_DIRECT_CHAT_OPEN_EVENT,
        handleDirectChatOpen,
      );
    };
  }, [openDirectRoomByTargetUser]);

  if (loading || !isAuthenticated) {
    return null;
  }

  const submitMessage = async (event) => {
    event.preventDefault();

    const content = messageInput.trim();
    if (isAdmin) {
      if (!content || sending) {
        return;
      }

      setSending(true);
      setError("");

      try {
        await broadcastNotice(content);
        setMessageInput("");
        toast.info("공지사항", "전체 유저에게 공지사항을 보냈습니다.", {
          sourceId: "admin-notice-sent",
        });
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            "공지사항 전송에 실패했습니다.",
        );
      } finally {
        setSending(false);
        window.setTimeout(() => {
          messageInputRef.current?.focus();
        }, 0);
      }
      return;
    }

    if (!activeRoomId || !content || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const { data } =
        chatType === "GROUP"
          ? await createChatMessage(activeRoomId, content)
          : await createDirectChatMessage(activeRoomId, content);

      if (chatType === "GROUP") {
        appendMessage(data, { notify: false });
      } else {
        appendDirectMessage(data, { notify: false });
      }
      setMessageInput("");
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "메시지 전송에 실패했습니다.",
      );
    } finally {
      setSending(false);
      window.setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);
    }
  };

  const sendStickerMessage = async (sticker) => {
    if (isAdmin || isNoticeMode || !activeRoomId || sending || !sticker) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const content = createStickerContent(sticker);
      const { data } =
        chatType === "GROUP"
          ? await createChatMessage(activeRoomId, content)
          : await createDirectChatMessage(activeRoomId, content);

      if (chatType === "GROUP") {
        appendMessage(data, { notify: false });
      } else {
        appendDirectMessage(data, { notify: false });
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "스티커 전송에 실패했습니다.",
      );
    } finally {
      setSending(false);
      window.setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);
    }
  };

  const startPanelResize = (event, direction) => {
    event.preventDefault();

    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;

    const resizePanel = (moveEvent) => {
      const maxWidth = Math.min(PANEL_DEFAULT_WIDTH, window.innerWidth - 32);
      const maxHeight = Math.min(PANEL_DEFAULT_HEIGHT, window.innerHeight - 48);

      setPanelSize({
        width: direction.includes("left")
          ? clamp(
              startWidth + startX - moveEvent.clientX,
              PANEL_MIN_WIDTH,
              maxWidth,
            )
          : startWidth,
        height: direction.includes("top")
          ? clamp(
              startHeight + startY - moveEvent.clientY,
              PANEL_MIN_HEIGHT,
              maxHeight,
            )
          : startHeight,
      });
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", resizePanel);
      window.removeEventListener("pointerup", stopResize);
    };

    window.addEventListener("pointermove", resizePanel);
    window.addEventListener("pointerup", stopResize);
  };

  const openMessageProfile = (message) => {
    if (!message?.userId) {
      return;
    }

    setProfileModalUser({
      userId: message.userId,
      nickname: message.nickname,
      profileImage: message.profileImage,
      createdAt: message.createdAt,
    });
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          className={styles.floatingButton}
          aria-label="무브톡 열기"
          onClick={() => {
            setOpen(true);
            loadMeetingRooms();
            loadDirectRooms();
          }}
        >
          <span aria-hidden="true" className={styles.floatingIcon}>
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M5.5 5.7c1.5-1.4 3.7-2.2 6.5-2.2 5 0 8.5 2.9 8.5 7.1s-3.5 7.1-8.5 7.1c-.8 0-1.6-.1-2.3-.2l-4.1 2.7c-.5.3-1.1-.1-.9-.7l1.1-3.5c-1.5-1.3-2.3-3.2-2.3-5.4 0-1.9.7-3.6 2-4.9Z" />
            </svg>
          </span>
        </button>
      ) : null}

      {open ? (
        <section
          ref={panelRef}
          className={styles.panel}
          aria-label="무브톡"
          style={
            panelSize
              ? {
                  width: `${panelSize.width}px`,
                  height: `${panelSize.height}px`,
                }
              : undefined
          }
        >
          <button
            type="button"
            className={styles.resizeLeft}
            aria-label="무브톡 가로 크기 조절"
            onPointerDown={(event) => startPanelResize(event, "left")}
          />
          <button
            type="button"
            className={styles.resizeTop}
            aria-label="무브톡 세로 크기 조절"
            onPointerDown={(event) => startPanelResize(event, "top")}
          />
          <button
            type="button"
            className={styles.resizeTopLeft}
            aria-label="무브톡 크기 조절"
            onPointerDown={(event) => startPanelResize(event, "top-left")}
          />
          <header className={styles.panelHeader}>
            <div>
              <div className={styles.panelTitleLine}>
                <strong>{isAdmin ? "공지사항" : "무브톡"}</strong>
                <button
                  type="button"
                  className={styles.noticeCollectionButton}
                  onClick={
                    isNoticeMode && isAdmin
                      ? closeNoticeCollection
                      : openNoticeCollection
                  }
                >
                  {isNoticeMode && isAdmin
                    ? "[공지사항 작성]"
                    : "[공지사항 모아보기]"}
                </button>
              </div>
              <span>
                {isNoticeMode
                  ? "전체 공지사항을 한 곳에서 확인합니다."
                  : isAdmin
                    ? "전체 유저 알림 발송"
                    : "모임 참여자들과 대화하기"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="무브톡 닫기"
            >
              x
            </button>
          </header>

          <div
            className={
              isAdmin
                ? styles.panelBodyAdmin
                : roomsCollapsed
                  ? `${styles.panelBody} ${styles.panelBodyCollapsed}`
                  : styles.panelBody
            }
          >
            {!isAdmin ? (
              <>
                <aside className={styles.roomList}>
                  <div className={styles.roomListHeader}>
                    <div
                      className={chatType === "GROUP" ? styles.active : ""}
                      onClick={() => {
                        setSidebarMode("ROOMS");
                        setChatType("GROUP");
                      }}
                    >
                      모임
                    </div>
                    <div
                      className={chatType === "PRIVATE" ? styles.active : ""}
                      onClick={() => {
                        setSidebarMode("ROOMS");
                        setChatType("PRIVATE");
                        loadDirectRooms();
                      }}
                    >
                      1대1 대화
                    </div>
                  </div>
                  {isStickerMode ? (
                    <div className={styles.stickerPanel}>
                      <div className={styles.stickerPanelHeader}>
                        <strong>WeMove 스티커</strong>
                        <span>더블클릭하면 전송됩니다.</span>
                      </div>
                      {wemoveStickers.length ? (
                        <div className={styles.stickerGrid}>
                          {wemoveStickers.map((sticker) => (
                            <button
                              key={sticker.id}
                              type="button"
                              className={styles.stickerItem}
                              disabled={!activeRoomId || sending}
                              onDoubleClick={() => sendStickerMessage(sticker)}
                              title={`${sticker.name} 스티커 보내기`}
                            >
                              <img src={sticker.src} alt={sticker.name} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.emptyState}>
                          <p>등록된 스티커가 없습니다.</p>
                          <small>
                            src/stickers/wemoveticker 폴더에 PNG를 넣어주세요.
                          </small>
                        </div>
                      )}
                    </div>
                  ) : loadingRooms ? (
                    <p>불러오는 중</p>
                  ) : chatType === "GROUP" ? (
                    rooms.length ? (
                      rooms.map((room) => (
                        <button
                          key={room.meetingId}
                          type="button"
                          className={
                            Number(room.meetingId) === Number(selectedMeetingId)
                              ? styles.roomActive
                              : styles.room
                          }
                          onClick={() => setSelectedMeetingId(room.meetingId)}
                          onContextMenu={(event) =>
                            openRoomMenu(event, "GROUP", room)
                          }
                        >
                          <strong>{room.title}</strong>
                          <span>
                            {[room.sportName, room.regionName, room.placeName]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          <small>
                            {getChatPreview(room.lastMessage) ||
                              formatSchedule(
                                room.meetingDate,
                                room.startTime,
                              ) ||
                              room.address ||
                              "대화 내역 없음"}
                          </small>
                        </button>
                      ))
                    ) : (
                      <p>참여 가능한 무브톡이 없습니다.</p>
                    )
                  ) : directRooms.length ? (
                    directRooms.map((room) => (
                      <button
                        key={room.roomId}
                        type="button"
                        className={
                          Number(room.roomId) === Number(selectedDirectRoomId)
                            ? styles.roomActive
                            : styles.room
                        }
                        onClick={() => setSelectedDirectRoomId(room.roomId)}
                        onContextMenu={(event) =>
                          openRoomMenu(event, "PRIVATE", room)
                        }
                      >
                        <strong>{room.targetNickname || "1:1 대화"}</strong>
                        <span>1:1 대화</span>
                        <small>
                          {getChatPreview(room.lastMessage) ||
                            "아직 메시지가 없습니다."}
                        </small>
                      </button>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <p>아직 대화 중인 친구가 없습니다.</p>
                      <small>모임 참여자 프로필에서 대화를 시작해보세요!</small>
                    </div>
                  )}
                </aside>
                <button
                  type="button"
                  className={styles.roomToggle}
                  aria-label={
                    roomsCollapsed ? "모임방 모음 펼치기" : "모임방 모음 숨기기"
                  }
                  onClick={() => setRoomsCollapsed((current) => !current)}
                >
                  {roomsCollapsed ? "›" : "‹"}
                </button>
              </>
            ) : null}

            <main className={styles.chatArea}>
              <div className={styles.chatTitle}>
                {isNoticeMode ? (
                  <strong>공지사항 모아보기</strong>
                ) : isAdmin ? (
                  <strong>공지사항 작성</strong>
                ) : chatType === "GROUP" && selectedRoom?.meetingId ? (
                  <button
                    type="button"
                    className={styles.chatTitleLink}
                    onClick={openSelectedMeetingDetail}
                  >
                    {selectedRoom.title}
                  </button>
                ) : (
                  <strong>
                    {chatType === "GROUP"
                      ? selectedRoom?.title || "무브톡을 선택해주세요"
                      : selectedRoom?.targetNickname ||
                        "1대1 대화를 선택해주세요"}
                  </strong>
                )}
                {isNoticeMode ? (
                  <span>최근 공지사항 알림을 시간순으로 모아봅니다.</span>
                ) : isAdmin ? (
                  <span>
                    입력한 내용은 모든 활성 유저의 알림으로 전송됩니다.
                  </span>
                ) : selectedRoom && chatType === "GROUP" ? (
                  <span>
                    {[
                      selectedRoom.sportName,
                      selectedRoom.regionName,
                      selectedRoom.placeName,
                      formatSchedule(
                        selectedRoom.meetingDate,
                        selectedRoom.startTime,
                      ),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                ) : selectedRoom ? (
                  <span>1:1 대화</span>
                ) : (
                  <span>왼쪽 목록에서 대화할 방을 선택해주세요.</span>
                )}
              </div>

              <div className={styles.messageList} ref={listRef}>
                {isNoticeMode ? (
                  loadingNotices ? (
                    <p className={styles.state}>공지사항을 불러오는 중입니다.</p>
                  ) : noticeMessages.length ? (
                    noticeMessages.map((notice, index) => {
                      const previousNotice = noticeMessages[index - 1];
                      const shouldShowDate =
                        index === 0 ||
                        getDateKey(previousNotice?.createdAt) !==
                          getDateKey(notice.createdAt);

                      return (
                        <div
                          key={notice.notificationId}
                          className={styles.messageGroup}
                        >
                          {shouldShowDate ? (
                            <div className={styles.messageDateDivider}>
                              {formatDateLabel(notice.createdAt)}
                            </div>
                          ) : null}
                          <article className={styles.noticeMessageCard}>
                            <div className={styles.noticeMessageHead}>
                              <strong>{notice.title}</strong>
                              <time>{formatTime(notice.createdAt)}</time>
                            </div>
                            {notice.message ? <p>{notice.message}</p> : null}
                          </article>
                        </div>
                      );
                    })
                  ) : (
                    <p className={styles.state}>아직 등록된 공지사항이 없습니다.</p>
                  )
                ) : isAdmin ? (
                  <div className={styles.adminNoticeGuide}>
                    <strong>전체 공지 발송</strong>
                    <p>
                      아래 입력창에 공지 내용을 입력하고 전송하면 모든 활성
                      회원에게 공지사항 알림이 저장되고, 접속 중인 회원에게는
                      실시간으로 전달됩니다.
                    </p>
                  </div>
                ) : !activeRoomId ? (
                  <p className={styles.state}>
                    무브톡 방을 선택하면 대화 내역을 볼 수 있습니다.
                  </p>
                ) : loadingMessages ? (
                  <p className={styles.state}>메시지를 불러오는 중입니다.</p>
                ) : messages.length ? (
                  messages.map((message, index) => {
                    const isMine =
                      Number(message.userId) === Number(user?.memberId);
                    const isSystem = message.messageType === "SYSTEM";
                    const isHostMessage =
                      chatType === "GROUP" &&
                      (message.host ||
                        (selectedRoom?.hostUserId &&
                          Number(message.userId) ===
                            Number(selectedRoom.hostUserId)) ||
                        (selectedRoom?.hostNickname &&
                          message.nickname === selectedRoom.hostNickname));
                    const previousMessage = messages[index - 1];
                    const shouldShowDate =
                      index === 0 ||
                      getDateKey(previousMessage?.createdAt) !==
                        getDateKey(message.createdAt);
                    const profileImage =
                      typeof message.profileImage === "string" &&
                      message.profileImage.trim()
                        ? message.profileImage.trim()
                        : defaultUserImage;
                    const sticker = getStickerFromContent(message.content);

                    return (
                      <div
                        key={message.messageId}
                        className={styles.messageGroup}
                      >
                        {shouldShowDate ? (
                          <div className={styles.messageDateDivider}>
                            {formatDateLabel(message.createdAt)}
                          </div>
                        ) : null}

                        {isSystem ? (
                          <p className={styles.systemMessage}>
                            {message.content}
                          </p>
                        ) : (
                          <article
                            className={
                              isMine ? styles.messageMineRow : styles.messageRow
                            }
                          >
                            {!isMine ? (
                              <button
                                type="button"
                                className={styles.messageProfileButton}
                                onClick={() => openMessageProfile(message)}
                              >
                                <img
                                  src={profileImage}
                                  alt={
                                    message.nickname
                                      ? `${message.nickname} 프로필`
                                      : "프로필"
                                  }
                                  className={styles.messageAvatar}
                                />
                              </button>
                            ) : null}

                            <div className={styles.messageContent}>
                              {!isMine ? (
                                <div className={styles.messageNameLine}>
                                  <button
                                    type="button"
                                    className={styles.messageNicknameButton}
                                    onClick={() => openMessageProfile(message)}
                                  >
                                    {message.nickname || "알 수 없음"}
                                  </button>
                                  {isHostMessage ? (
                                    <span className={styles.hostCrownBadge}>
                                      <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z" />
                                      </svg>
                                      방장
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              <div
                                className={
                                  isMine
                                    ? styles.messageMineLine
                                    : styles.messageLine
                                }
                              >
                                {isMine ? (
                                  <span className={styles.messageTime}>
                                    {formatTime(message.createdAt)}
                                  </span>
                                ) : null}
                                {sticker ? (
                                  <div
                                    className={
                                      isMine
                                        ? styles.messageMineStickerBubble
                                        : styles.messageStickerBubble
                                    }
                                  >
                                    <img src={sticker.src} alt={sticker.name} />
                                  </div>
                                ) : (
                                  <p
                                    className={
                                      isMine
                                        ? styles.messageMineBubble
                                        : styles.messageBubble
                                    }
                                  >
                                    {message.content}
                                  </p>
                                )}
                                {!isMine ? (
                                  <span className={styles.messageTime}>
                                    {formatTime(message.createdAt)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.state}>아직 메시지가 없습니다.</p>
                )}
              </div>

              {error ? <p className={styles.error}>{error}</p> : null}

              {!isNoticeMode ? (
                <form
                  className={
                    isAdmin
                      ? `${styles.messageForm} ${styles.messageFormAdmin}`
                      : styles.messageForm
                  }
                  onSubmit={submitMessage}
                >
                  {!isAdmin ? (
                    <button
                      type="button"
                      className={
                        isStickerMode
                          ? `${styles.stickerToggleButton} ${styles.stickerToggleButtonActive}`
                          : styles.stickerToggleButton
                      }
                      aria-label="스티커 목록 열기"
                      title="스티커"
                      onClick={() =>
                        setSidebarMode((current) => {
                          setRoomsCollapsed(false);
                          return current === "STICKERS" ? "ROOMS" : "STICKERS";
                        })
                      }
                    >
                      🙂
                    </button>
                  ) : null}
                  <input
                    ref={messageInputRef}
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    placeholder="메시지 입력"
                    maxLength={1000}
                    disabled={isAdmin ? sending : !activeRoomId || sending}
                  />
                  <button
                    type="submit"
                    disabled={
                      isAdmin
                        ? !messageInput.trim() || sending
                        : !activeRoomId || sending
                    }
                  >
                    전송
                  </button>
                </form>
              ) : null}
            </main>
          </div>
        </section>
      ) : null}

      {roomMenu ? (
        <div
          className={styles.roomContextMenu}
          style={{ left: roomMenu.x, top: roomMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={leaveSelectedRoom}>
            톡방 나가기
          </button>
        </div>
      ) : null}

      <UserProfileDetailModal
        open={Boolean(profileModalUser)}
        onClose={() => setProfileModalUser(null)}
        user={profileModalUser}
        loginUser={user}
      />
    </>
  );
}
