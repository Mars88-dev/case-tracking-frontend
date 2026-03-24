import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import axios from "axios";
import {
  THEMES,
  getTheme,
  toggleTheme,
  onThemeChange,
  offThemeChange,
} from "../theme/theme";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const NAVBAR_REFRESH_MS = 8000;

function trimPreview(value) {
  if (!value) return "You have a new message.";
  return value.length > 90 ? `${value.slice(0, 90)}…` : value;
}

export default function Navbar() {
  const [mode, setMode] = useState(getTheme());
  const [isAuthed, setIsAuthed] = useState(!!localStorage.getItem("token"));
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const location = useLocation();

  const previousUnreadMapRef = useRef({});
  const initializedUnreadRef = useRef(false);
  const audioContextRef = useRef(null);
  const originalTitleRef = useRef(
    typeof document !== "undefined" && document.title
      ? document.title
      : "Conveyancing Portal"
  );
  const activeConversationUserIdRef = useRef("");

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const ctx = audioContextRef.current;

      const playTone = () => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);

        gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.32);
      };

      if (ctx.state === "suspended") {
        ctx.resume().then(playTone).catch(() => {});
      } else {
        playTone();
      }
    } catch (err) {
      console.error("Notification sound failed:", err);
    }
  }, []);

  const showBrowserNotification = useCallback(async (title, body, options = {}) => {
    try {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      const {
        tag = "personal-message-alert",
        userId = "",
        url = `${window.location.origin}/messages`,
      } = options;

      const notificationOptions = {
        body,
        tag,
        renotify: true,
        requireInteraction: true,
        icon: "/logo192.png",
        badge: "/logo192.png",
        data: {
          url,
          userId,
          timestamp: Date.now(),
        },
      };

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration?.showNotification) {
            await registration.showNotification(title, notificationOptions);
            return;
          }
        } catch (swError) {
          console.error("Service worker notification failed:", swError);
        }
      }

      new Notification(title, notificationOptions);
    } catch (err) {
      console.error("Browser notification failed:", err);
    }
  }, []);

  const fetchUnreadState = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUnreadCount(0);
      setToast(null);
      previousUnreadMapRef.current = {};
      initializedUnreadRef.current = false;
      return;
    }

    try {
      const res = await axios.get(`${BASE_URL}/api/personal-messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const safeConversations = Array.isArray(res.data) ? res.data : [];

      let totalUnread = 0;
      const nextUnreadMap = {};
      let newestConversationWithNewUnread = null;

      for (const conversation of safeConversations) {
        const userId = conversation?.user?._id;
        if (!userId) continue;

        const currentUnread = Number(conversation?.unreadCount || 0);
        const previousUnread = Number(previousUnreadMapRef.current[userId] || 0);

        totalUnread += currentUnread;
        nextUnreadMap[userId] = currentUnread;

        const isActiveConversation =
          activeConversationUserIdRef.current &&
          activeConversationUserIdRef.current === userId;

        if (
          initializedUnreadRef.current &&
          currentUnread > previousUnread &&
          !isActiveConversation
        ) {
          if (
            !newestConversationWithNewUnread ||
            new Date(conversation.updatedAt) >
              new Date(newestConversationWithNewUnread.updatedAt)
          ) {
            newestConversationWithNewUnread = conversation;
          }
        }
      }

      setUnreadCount(totalUnread);

      if (newestConversationWithNewUnread) {
        const username =
          newestConversationWithNewUnread?.user?.username || "Someone";
        const preview = trimPreview(newestConversationWithNewUnread?.lastMessage);
        const userId = newestConversationWithNewUnread?.user?._id || "general";

        setToast({
          id: Date.now(),
          title: `💬 New message from ${username}`,
          body: preview,
        });

        playNotificationSound();
        showBrowserNotification(`New message from ${username}`, preview, {
          tag: `personal-message-alert-${userId}`,
          userId,
        });
      }

      previousUnreadMapRef.current = nextUnreadMap;
      initializedUnreadRef.current = true;
    } catch (err) {
      console.error("Failed to fetch unread state:", err);
      setUnreadCount(0);
    }
  }, [playNotificationSound, showBrowserNotification]);

  useEffect(() => {
    const handler = (e) => setMode(e.detail?.mode || getTheme());
    onThemeChange(handler);
    return () => offThemeChange(handler);
  }, []);

  useEffect(() => {
    const authed = !!localStorage.getItem("token");
    setIsAuthed(authed);

    if (!authed) {
      setUnreadCount(0);
      setToast(null);
      previousUnreadMapRef.current = {};
      initializedUnreadRef.current = false;
      return;
    }

    fetchUnreadState();
  }, [location, fetchUnreadState]);

  useEffect(() => {
    if (!isAuthed) return undefined;

    const interval = setInterval(fetchUnreadState, NAVBAR_REFRESH_MS);
    return () => clearInterval(interval);
  }, [isAuthed, fetchUnreadState]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchUnreadState();
    };

    window.addEventListener("messages:refresh-unread", handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      window.removeEventListener("messages:refresh-unread", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, [fetchUnreadState]);

  useEffect(() => {
    if (!isAuthed) return undefined;
    if (!("Notification" in window)) return undefined;
    if (Notification.permission !== "default") return undefined;

    let asked = false;

    const requestPermission = () => {
      if (asked) return;
      asked = true;
      Notification.requestPermission().catch(() => {});
    };

    window.addEventListener("click", requestPermission, { once: true });
    window.addEventListener("keydown", requestPermission, { once: true });
    window.addEventListener("touchstart", requestPermission, { once: true });

    return () => {
      window.removeEventListener("click", requestPermission);
      window.removeEventListener("keydown", requestPermission);
      window.removeEventListener("touchstart", requestPermission);
    };
  }, [isAuthed]);

  useEffect(() => {
    const handleActiveConversationChange = (event) => {
      activeConversationUserIdRef.current = event?.detail?.userId || "";
    };

    const handleLiveIncoming = (event) => {
      const username = event?.detail?.username || "Someone";
      const preview = trimPreview(event?.detail?.body);
      const userId = event?.detail?.userId || "live";

      setToast({
        id: Date.now(),
        title: `💬 New message from ${username}`,
        body: preview,
      });

      playNotificationSound();
      showBrowserNotification(`New message from ${username}`, preview, {
        tag: `personal-message-alert-${userId}`,
        userId,
      });
    };

    window.addEventListener(
      "messages:active-conversation-change",
      handleActiveConversationChange
    );
    window.addEventListener("messages:incoming-live", handleLiveIncoming);

    return () => {
      window.removeEventListener(
        "messages:active-conversation-change",
        handleActiveConversationChange
      );
      window.removeEventListener("messages:incoming-live", handleLiveIncoming);
    };
  }, [playNotificationSound, showBrowserNotification]);

  useEffect(() => {
    const baseTitle = originalTitleRef.current || "Conveyancing Portal";
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;

    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);

  return (
    <>
      <header className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 40, borderRadius: 8 }} />
          <strong style={{ color: "var(--color-primary)" }}>Conveyancing Portal</strong>
        </div>

        {isAuthed && (
          <nav className="links">
            <NavLink
              to="/dashboard"
              aria-current={
                location.pathname === "/" || location.pathname === "/dashboard"
                  ? "page"
                  : undefined
              }
            >
              🏠 Dashboard
            </NavLink>

            <NavLink to="/my-transactions">📁 My Transactions</NavLink>

            <NavLink to="/messages">
              <span style={styles.linkWithBadge}>
                💬 Messages
                {unreadCount > 0 && (
                  <span className="badge" style={styles.badge}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            </NavLink>

            <NavLink to="/calculator">🧮 Cost Calculator</NavLink>
          </nav>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isAuthed && (
            <NavLink
              to="/case/new"
              className="neumo-button"
              title="Create a new transaction"
              aria-label="Create a new transaction"
            >
              ➕ New Transaction
            </NavLink>
          )}

          <button
            type="button"
            className="neumo-button"
            onClick={() => {
              toggleTheme();
              setMode(getTheme() === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT);
            }}
            aria-pressed={mode === THEMES.DARK}
            title="Toggle theme"
          >
            {mode === THEMES.DARK ? "🌙 Dark" : "☀️ Light"}
          </button>

          {isAuthed ? (
            <NavLink to="/logout" className="neumo-button" title="Log out">
              Logout
            </NavLink>
          ) : (
            <NavLink to="/login" className="neumo-button" title="Log in">
              Login
            </NavLink>
          )}
        </div>
      </header>

      {toast && (
        <div style={styles.toastWrap}>
          <div style={styles.toastHeader}>
            <div style={styles.toastTitle}>{toast.title}</div>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={styles.toastClose}
              aria-label="Close notification"
              title="Close notification"
            >
              ×
            </button>
          </div>
          <div style={styles.toastBody}>{toast.body}</div>
        </div>
      )}
    </>
  );
}

const styles = {
  linkWithBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: 22,
    height: 22,
    padding: "0 6px",
    borderRadius: 999,
    fontWeight: 800,
    lineHeight: "22px",
    background: "#ef4444",
    color: "#fff",
    fontSize: 12,
    boxShadow: "0 6px 16px rgba(239, 68, 68, 0.35)",
  },
  toastWrap: {
    position: "fixed",
    top: 84,
    right: 18,
    zIndex: 9999,
    width: 340,
    maxWidth: "calc(100vw - 32px)",
    padding: 16,
    borderRadius: 18,
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "12px 12px 28px var(--shadow-lo), -12px -12px 28px var(--shadow-hi)",
    border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
  },
  toastHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  toastTitle: {
    fontWeight: 800,
    color: "var(--color-primary)",
    fontSize: 14,
    lineHeight: 1.4,
  },
  toastBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--muted)",
    wordBreak: "break-word",
  },
  toastClose: {
    border: "none",
    background: "transparent",
    color: "var(--muted)",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  },
};
