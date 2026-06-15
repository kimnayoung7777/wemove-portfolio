import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  deleteNotification as deleteNotificationApi,
  deleteNotifications,
  getNotifications,
  markNotificationsReadAll,
} from "../api/notificationApi";
import { useAuth } from "./AuthContext";
import {
  createLocalDateTimeStamp,
  NOTIFICATION_TYPES,
  WEMOVE_NOTIFICATION_EVENT,
} from "../utils/notificationEvents";

const MAX_NOTIFICATION_COUNT = 50;

const NotificationContext = createContext(null);

const createNotification = (detail) => ({
  id:
    detail?.id ||
    detail?.notificationId ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  notificationId: detail?.notificationId || detail?.id,
  type: detail?.type || NOTIFICATION_TYPES.INFO,
  chatKind: detail?.chatKind,
  title: detail?.title || "",
  message: detail?.message || "",
  targetType: detail?.targetType,
  targetId: detail?.targetId,
  sourceId: detail?.sourceId,
  isRead: detail?.isRead === true || detail?.isRead === 1,
  createdAt: detail?.createdAt || createLocalDateTimeStamp(),
});

const getNotificationKey = (notification) => {
  if (notification.type === NOTIFICATION_TYPES.CHAT) {
    return `${notification.type}:${notification.chatKind || "GENERAL"}:${
      notification.sourceId || notification.title
    }`;
  }

  return notification.id;
};

export function NotificationProvider({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadKeys, setUnreadKeys] = useState(() => new Set());
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const pushNotification = useCallback((detail) => {
    const notification = createNotification(detail);

    if (!notification.title) {
      return;
    }

    setNotifications((current) => {
      const notificationKey = getNotificationKey(notification);
      const existingIndex = current.findIndex(
        (item) => getNotificationKey(item) === notificationKey,
      );

      if (existingIndex === -1) {
        return [notification, ...current].slice(0, MAX_NOTIFICATION_COUNT);
      }

      const next = [...current];
      next.splice(existingIndex, 1);
      return [notification, ...next].slice(0, MAX_NOTIFICATION_COUNT);
    });
    setUnreadKeys((current) => {
      const next = new Set(current);
      next.add(getNotificationKey(notification));
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (loading) {
        return;
      }

      if (!isAuthenticated) {
        setNotifications([]);
        setUnreadKeys(new Set());
        return;
      }

      try {
        const { data } = await getNotifications();
        if (!active) {
          return;
        }

        const nextNotifications = Array.isArray(data)
          ? data.map(createNotification)
          : [];
        setNotifications(nextNotifications);
        setUnreadKeys(
          new Set(
            nextNotifications
              .filter((notification) => !notification.isRead)
              .map(getNotificationKey),
          ),
        );
      } catch {
        if (active) {
          setNotifications([]);
          setUnreadKeys(new Set());
        }
      }
    };

    loadNotifications();

    return () => {
      active = false;
    };
  }, [isAuthenticated, loading]);

  useEffect(() => {
    const handleNotification = (event) => {
      pushNotification(event.detail);
    };

    window.addEventListener(WEMOVE_NOTIFICATION_EVENT, handleNotification);
    return () => {
      window.removeEventListener(WEMOVE_NOTIFICATION_EVENT, handleNotification);
    };
  }, [pushNotification]);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
    setUnreadKeys(new Set());
    markNotificationsReadAll().catch(() => {});
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((current) => {
      if (!current) {
        setUnreadKeys(new Set());
        markNotificationsReadAll().catch(() => {});
      }
      return !current;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadKeys(new Set());
    deleteNotifications().catch(() => {});
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications((current) => {
      const target = current.find((item) => item.id === notificationId);
      if (target) {
        setUnreadKeys((keys) => {
          const next = new Set(keys);
          next.delete(getNotificationKey(target));
          return next;
        });
      }
      return current.filter((item) => item.id !== notificationId);
    });
    if (Number.isFinite(Number(notificationId))) {
      deleteNotificationApi(notificationId).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: unreadKeys.size,
      isPanelOpen,
      pushNotification,
      openPanel,
      closePanel,
      togglePanel,
      clearAll,
      removeNotification,
    }),
    [
      notifications,
      unreadKeys,
      isPanelOpen,
      pushNotification,
      openPanel,
      closePanel,
      togglePanel,
      clearAll,
      removeNotification,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }

  return context;
}
