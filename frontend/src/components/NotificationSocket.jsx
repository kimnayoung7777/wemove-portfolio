import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  NOTIFICATION_TYPES,
  publishAccountSuspend,
  publishNotification,
} from "../utils/notificationEvents";
import { getAccessToken } from "../utils/authTokenStore";
import { buildWsUrl } from "../config/env";

const RECONNECT_DELAY_MS = 3000;

export default function NotificationSocket() {
  const { isAuthenticated, accessToken } = useAuth();
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    let closedByEffect = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      socketRef.current?.close();
      socketRef.current = null;
    };

    const scheduleReconnect = (connect) => {
      if (closedByEffect || !isAuthenticated) {
        return;
      }

      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    const handleMessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (
          payload.type === NOTIFICATION_TYPES.ACCOUNT_SUSPEND ||
          payload.forceLogout
        ) {
          publishAccountSuspend({
            title: payload.title || "계정 정지 안내",
            message: payload.message || "",
            reason: payload.reason,
            suspendedUntil: payload.suspendedUntil,
            suspendHours: payload.suspendHours,
          });
          return;
        }

        publishNotification({
          id: payload.id || payload.notificationId,
          notificationId: payload.notificationId || payload.id,
          type: payload.type || NOTIFICATION_TYPES.INFO,
          chatKind: payload.chatKind,
          title: payload.title,
          message: payload.message || "",
          targetType: payload.targetType,
          targetId: payload.targetId,
          sourceId: payload.sourceId,
          isRead: payload.isRead,
          createdAt: payload.createdAt,
          suspendedUntil: payload.suspendedUntil,
          suspendHours: payload.suspendHours,
        });
      } catch {
        // Ignore malformed notification payloads.
      }
    };

    const connect = () => {
      const token = accessToken || getAccessToken();

      if (!isAuthenticated || !token || closedByEffect) {
        closeSocket();
        return;
      }

      closeSocket();

      const socket = new WebSocket(buildWsUrl("/notifications", { token }));

      socket.onmessage = handleMessage;
      socket.onerror = () => {
        socket.close();
      };
      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        scheduleReconnect(connect);
      };

      socketRef.current = socket;
    };

    clearReconnectTimer();
    connect();

    return () => {
      closedByEffect = true;
      clearReconnectTimer();
      closeSocket();
    };
  }, [accessToken, isAuthenticated]);

  return null;
}
