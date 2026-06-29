import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import axios from "axios";
import {
  FaBuilding,
  FaCalculator,
  FaChevronDown,
  FaComments,
  FaFolderOpen,
  FaHome,
  FaMoon,
  FaPlus,
  FaSun,
  FaUserCircle,
} from "react-icons/fa";
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

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function initialsFromName(name) {
  const cleaned = String(name || "User").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

  const publicRoute = ["/login", "/register", "/logout"].includes(location.pathname);
  const storedUser = getStoredUser();
  const displayName =
    storedUser?.username ||
    storedUser?.name ||
    storedUser?.fullName ||
    storedUser?.email?.split("@")[0] ||
    "Sarah Jacobs";
  const displayRole = storedUser?.role || storedUser?.position || "Conveyancer";
  const isCalculator = location.pathname.startsWith("/calculator");

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
          title: `New message from ${username}`,
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
        title: `New message from ${username}`,
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

  if (publicRoute || !isAuthed) return null;

  const navClass = ({ isActive }) => (isActive ? "gba-nav-link active" : "gba-nav-link");
  const dashboardClass = location.pathname === "/" || location.pathname === "/dashboard"
    ? "gba-nav-link active"
    : "gba-nav-link";

  return (
    <>
      <aside className="gba-sidebar" aria-label="Portal sidebar">
        <div className="gba-sidebar-brand">
          <img src="/logo.png" alt="Gerhard Barnard Inc" className="gba-sidebar-logo" />
          <div>
            <strong>Gerhard Barnard Inc</strong>
            <span>Conveyancing Portal</span>
          </div>
        </div>

        <div className="gba-sidebar-context">
          {isCalculator ? (
            <>
              <NavLink to="/dashboard" className="gba-sidebar-back">
                ‹ Cost Calculator
              </NavLink>
              <div className="gba-stepper" aria-label="Calculator flow">
                <div className="gba-step active">
                  <span>1</span>
                  <div>
                    <strong>Matter Details</strong>
                    <small>Property & purchase info</small>
                  </div>
                </div>
                <div className="gba-step">
                  <span>2</span>
                  <div>
                    <strong>Allowances</strong>
                    <small>Firm & bond allowances</small>
                  </div>
                </div>
                <div className="gba-step">
                  <span>3</span>
                  <div>
                    <strong>Review & Breakdown</strong>
                    <small>Calculation summary</small>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="gba-sidebar-copy">
              <span className="gba-sidebar-kicker">Matter workspace</span>
              <strong>Trusted expertise. Seamless transfers.</strong>
              <p>Track transactions, communicate with the team and generate accurate client updates from one clean workspace.</p>
            </div>
          )}
        </div>

        <div className="gba-sidebar-footer">
          <img src="/logo.png" alt="Gerhard Barnard Inc" />
          <p>Trusted expertise.<br />Seamless transfers.</p>
        </div>
      </aside>

      <header className="gba-topbar">
        <nav className="gba-nav-links" aria-label="Primary navigation">
          <NavLink to="/dashboard" className={dashboardClass}>
            <FaHome /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/my-transactions" className={navClass}>
            <FaFolderOpen /> <span>My Transactions</span>
          </NavLink>
          <NavLink to="/messages" className={navClass}>
            <span className="gba-link-with-badge">
              <FaComments /> <span>Messages</span>
              {unreadCount > 0 && (
                <span className="gba-message-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
          </NavLink>
          <NavLink to="/calculator" className={navClass}>
            <FaCalculator /> <span>Cost Calculator</span>
          </NavLink>
          <NavLink to="/inhouse-agents" className={navClass}>
            <FaBuilding /> <span>Inhouse Agents</span>
          </NavLink>
        </nav>

        <div className="gba-topbar-actions">
          <button
            type="button"
            className="gba-icon-toggle"
            onClick={() => {
              toggleTheme();
              setMode(getTheme() === THEMES.DARK ? THEMES.DARK : THEMES.LIGHT);
            }}
            aria-pressed={mode === THEMES.DARK}
            title="Toggle theme"
          >
            <FaSun />
            <span className={mode === THEMES.DARK ? "active" : ""}>
              <FaMoon />
            </span>
          </button>

          <NavLink
            to="/case/new"
            className="gba-new-transaction"
            title="Create a new transaction"
            aria-label="Create a new transaction"
          >
            <FaPlus /> New Transaction
          </NavLink>

          <details className="gba-user-menu">
            <summary>
              <span className="gba-user-avatar">{initialsFromName(displayName)}</span>
              <span className="gba-user-copy">
                <strong>{displayName}</strong>
                <small>{displayRole}</small>
              </span>
              <FaChevronDown />
            </summary>
            <div className="gba-user-dropdown">
              <div className="gba-user-dropdown-head">
                <FaUserCircle />
                <span>{displayName}</span>
              </div>
              <NavLink to="/logout">Log out</NavLink>
            </div>
          </details>
        </div>
      </header>

      {toast && (
        <div className="gba-toast-wrap">
          <div className="gba-toast-header">
            <div className="gba-toast-title">{toast.title}</div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="gba-toast-close"
              aria-label="Close notification"
              title="Close notification"
            >
              ×
            </button>
          </div>
          <div className="gba-toast-body">{toast.body}</div>
        </div>
      )}
    </>
  );
}
