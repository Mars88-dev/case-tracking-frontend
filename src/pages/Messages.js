// src/pages/Messages.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const REFRESH_INTERVAL_MS = 8000;

function formatTimestamp(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function previewText(value) {
  if (!value) return "No messages yet";
  return value.length > 72 ? `${value.slice(0, 72)}…` : value;
}

export default function Messages() {
  const [directory, setDirectory] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [pageError, setPageError] = useState("");
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

  const token = localStorage.getItem("token");
  const messageEndRef = useRef(null);

  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const fetchSidebarData = useCallback(async () => {
    if (!token) return null;

    const [usersRes, conversationsRes, meRes] = await Promise.all([
      axios.get(`${BASE_URL}/api/users/directory`, authHeaders),
      axios.get(`${BASE_URL}/api/personal-messages/conversations`, authHeaders),
      axios.get(`${BASE_URL}/api/users/me`, authHeaders),
    ]);

    const safeUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
    const safeConversations = Array.isArray(conversationsRes.data)
      ? conversationsRes.data
      : [];

    setDirectory(safeUsers);
    setConversations(safeConversations);
    setCurrentUser(meRes.data || null);

    return {
      users: safeUsers,
      conversations: safeConversations,
    };
  }, [authHeaders, token]);

  const fetchConversation = useCallback(
    async (userId, { silent = false } = {}) => {
      if (!token || !userId) return;

      if (!silent) {
        setLoadingMessages(true);
      }

      try {
        const res = await axios.get(
          `${BASE_URL}/api/personal-messages/${userId}`,
          authHeaders
        );

        setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
        setSelectedUser(res.data?.conversationWith || null);
      } catch (err) {
        console.error("Failed to fetch conversation:", err);
        setPageError(err.response?.data?.message || "Failed to load conversation.");
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [authHeaders, token]
  );

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      setLoadingSidebar(true);
      setPageError("");

      try {
        const result = await fetchSidebarData();
        if (!mounted || !result) return;

        const firstConversationUserId = result.conversations[0]?.user?._id || "";
        const firstDirectoryUserId = result.users[0]?._id || "";

        setSelectedUserId((prev) => prev || firstConversationUserId || firstDirectoryUserId);
      } catch (err) {
        console.error("Failed to load messages page:", err);
        if (mounted) {
          setPageError(err.response?.data?.message || "Failed to load messaging page.");
        }
      } finally {
        if (mounted) {
          setLoadingSidebar(false);
        }
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, [fetchSidebarData]);

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      setSelectedUser(null);
      return;
    }

    fetchConversation(selectedUserId).then(() => {
      fetchSidebarData().catch(() => {});
    });
  }, [selectedUserId, fetchConversation, fetchSidebarData]);

  useEffect(() => {
    if (!selectedUserId) return undefined;

    const interval = setInterval(async () => {
      try {
        await fetchSidebarData();
        await fetchConversation(selectedUserId, { silent: true });
      } catch (err) {
        console.error("Background refresh failed:", err);
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchSidebarData, fetchConversation, selectedUserId]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const conversationMap = useMemo(() => {
    return conversations.reduce((acc, item) => {
      if (item?.user?._id) {
        acc[item.user._id] = item;
      }
      return acc;
    }, {});
  }, [conversations]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const withConversations = conversations
      .map((item) => item.user)
      .filter(Boolean)
      .filter((user, index, arr) => arr.findIndex((entry) => entry._id === user._id) === index);

    const remainingUsers = directory
      .filter((user) => !withConversations.some((entry) => entry._id === user._id))
      .sort((a, b) => (a.username || "").localeCompare(b.username || ""));

    const combined = [...withConversations, ...remainingUsers];

    if (!query) return combined;

    return combined.filter((user) => {
      const username = (user.username || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      return username.includes(query) || email.includes(query);
    });
  }, [conversations, directory, searchQuery]);

  const handleSelectUser = (user) => {
    setPageError("");
    setSelectedUserId(user._id);
  };

  const handleSend = async (e) => {
    e.preventDefault();

    const content = draft.trim();
    if (!content || !selectedUserId || sending) return;

    setSending(true);
    setPageError("");

    try {
      await axios.post(
        `${BASE_URL}/api/personal-messages/${selectedUserId}`,
        { content },
        authHeaders
      );

      setDraft("");
      await fetchConversation(selectedUserId, { silent: true });
      await fetchSidebarData();
    } catch (err) {
      console.error("Failed to send message:", err);
      setPageError(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const selectedConversationMeta = selectedUserId ? conversationMap[selectedUserId] : null;
  const isCompact = windowWidth < 1100;

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlow} />

      <div style={{ ...styles.shell, ...(isCompact ? styles.shellCompact : {}) }}>
        <aside style={{ ...styles.sidebar, ...(isCompact ? styles.sidebarCompact : {}) }}>
          <div style={styles.sidebarHeader}>
            <div>
              <h1 style={styles.sidebarTitle}>Messages</h1>
              <p style={styles.sidebarSubtitle}>Private staff messaging with unread notifications</p>
            </div>
          </div>

          <div style={styles.searchWrap}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email"
              style={styles.searchInput}
            />
          </div>

          {loadingSidebar ? (
            <div style={styles.stateCard}>Loading conversations…</div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.stateCard}>No other users found in this portal yet.</div>
          ) : (
            <div style={styles.userList}>
              {filteredUsers.map((user) => {
                const meta = conversationMap[user._id];
                const isSelected = selectedUserId === user._id;
                const unreadCount = Number(meta?.unreadCount || 0);

                return (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    style={{
                      ...styles.userRow,
                      ...(isSelected ? styles.userRowSelected : {}),
                    }}
                  >
                    <div style={styles.avatar}>{(user.username || "U").slice(0, 1).toUpperCase()}</div>

                    <div style={styles.userMeta}>
                      <div style={styles.userTopRow}>
                        <strong style={styles.userName}>{user.username}</strong>
                        {unreadCount > 0 && <span style={styles.unreadPill}>{unreadCount}</span>}
                      </div>

                      <div style={styles.userEmail}>{user.email}</div>
                      <div style={styles.userPreview}>{previewText(meta?.lastMessage)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section style={{ ...styles.conversationPane, ...(isCompact ? styles.conversationPaneCompact : {}) }}>
          {!selectedUserId ? (
            <div style={styles.emptyState}>
              Select a user on the left to start a private conversation.
            </div>
          ) : (
            <>
              <div style={styles.conversationHeader}>
                <div>
                  <h2 style={styles.conversationTitle}>
                    {selectedUser?.username || "Conversation"}
                  </h2>
                  <div style={styles.conversationMeta}>
                    {selectedUser?.email || "Loading user details…"}
                  </div>
                </div>

                {selectedConversationMeta?.unreadCount > 0 && (
                  <div style={styles.headerUnreadBadge}>
                    {selectedConversationMeta.unreadCount} unread
                  </div>
                )}
              </div>

              {pageError && <div style={styles.errorBox}>{pageError}</div>}

              <div style={styles.messagesViewport}>
                {loadingMessages ? (
                  <div style={styles.stateCard}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={styles.stateCard}>No messages yet. Start the conversation below.</div>
                ) : (
                  messages.map((message) => {
                    const isMine = String(message.senderId) === String(currentUser?._id);

                    return (
                      <div
                        key={message._id}
                        style={{
                          ...styles.messageRow,
                          justifyContent: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            ...styles.messageBubble,
                            ...(isMine ? styles.messageBubbleMine : styles.messageBubbleOther),
                          }}
                        >
                          <div style={styles.messageText}>{message.content}</div>
                          <div style={styles.messageStamp}>{formatTimestamp(message.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <form onSubmit={handleSend} style={styles.composeBar}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${selectedUser?.username || "this user"}…`}
                  style={styles.composeInput}
                  rows={3}
                  maxLength={2000}
                />

                <div style={styles.composeFooter}>
                  <div style={styles.characterCount}>{draft.trim().length}/2000</div>
                  <button
                    type="submit"
                    className="neumo-button"
                    disabled={sending || !draft.trim()}
                    style={sending || !draft.trim() ? styles.disabledButton : undefined}
                  >
                    {sending ? "Sending…" : "Send Message"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 72px)",
    position: "relative",
    background: "var(--bg)",
    padding: 20,
  },
  backgroundGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top left, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 35%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 42%)",
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1400,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "360px minmax(0, 1fr)",
    gap: 20,
    alignItems: "stretch",
  },
  shellCompact: {
    gridTemplateColumns: "1fr",
  },
  sidebar: {
    background: "var(--surface)",
    borderRadius: 20,
    padding: 20,
    boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 112px)",
  },
  sidebarCompact: {
    minHeight: "auto",
  },
  sidebarHeader: {
    marginBottom: 16,
  },
  sidebarTitle: {
    margin: 0,
    fontSize: 28,
    color: "var(--color-primary)",
  },
  sidebarSubtitle: {
    margin: "8px 0 0",
    color: "var(--muted)",
    lineHeight: 1.5,
  },
  searchWrap: {
    marginBottom: 16,
  },
  searchInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "inset 3px 3px 8px var(--shadow-lo), inset -3px -3px 8px var(--shadow-hi)",
    fontSize: 14,
    outline: "none",
  },
  userList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflowY: "auto",
    paddingRight: 4,
  },
  userRow: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    width: "100%",
    border: "none",
    borderRadius: 16,
    padding: 14,
    textAlign: "left",
    cursor: "pointer",
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "6px 6px 14px var(--shadow-lo), -6px -6px 14px var(--shadow-hi)",
  },
  userRowSelected: {
    outline: "2px solid color-mix(in srgb, var(--color-accent) 70%, white)",
  },
  avatar: {
    width: 44,
    height: 44,
    minWidth: 44,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    color: "#fff",
    fontWeight: 800,
    fontSize: 18,
  },
  userMeta: {
    minWidth: 0,
    flex: 1,
  },
  userTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  userName: {
    fontSize: 15,
    color: "var(--text)",
  },
  userEmail: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--muted)",
    wordBreak: "break-word",
  },
  userPreview: {
    marginTop: 8,
    fontSize: 13,
    color: "var(--muted)",
    lineHeight: 1.4,
  },
  unreadPill: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    padding: "0 6px",
    background: "#ef4444",
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
  },
  conversationPane: {
    background: "var(--surface)",
    borderRadius: 20,
    padding: 20,
    boxShadow: "8px 8px 18px var(--shadow-lo), -8px -8px 18px var(--shadow-hi)",
    minHeight: "calc(100vh - 112px)",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  conversationPaneCompact: {
    minHeight: "70vh",
  },
  conversationHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 16,
    borderBottom: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
  },
  conversationTitle: {
    margin: 0,
    color: "var(--color-primary)",
    fontSize: 26,
  },
  conversationMeta: {
    marginTop: 6,
    color: "var(--muted)",
    fontSize: 14,
  },
  headerUnreadBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(239, 68, 68, 0.12)",
    color: "#b91c1c",
    fontWeight: 800,
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  messagesViewport: {
    flex: 1,
    overflowY: "auto",
    padding: "18px 4px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  messageBubble: {
    maxWidth: "74%",
    borderRadius: 18,
    padding: "12px 14px",
    boxShadow: "6px 6px 12px var(--shadow-lo), -6px -6px 12px var(--shadow-hi)",
  },
  messageBubbleMine: {
    background: "linear-gradient(135deg, var(--color-primary), #1c3b6a)",
    color: "#fff",
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    background: "var(--surface)",
    color: "var(--text)",
    borderBottomLeftRadius: 6,
  },
  messageText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.5,
    fontSize: 14,
  },
  messageStamp: {
    marginTop: 8,
    fontSize: 11,
    opacity: 0.8,
    textAlign: "right",
  },
  composeBar: {
    borderTop: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
    paddingTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  composeInput: {
    width: "100%",
    minHeight: 88,
    resize: "vertical",
    padding: 14,
    borderRadius: 16,
    border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "inset 4px 4px 10px var(--shadow-lo), inset -4px -4px 10px var(--shadow-hi)",
    fontSize: 14,
    outline: "none",
  },
  composeFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  characterCount: {
    color: "var(--muted)",
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: "var(--muted)",
    fontSize: 16,
    padding: 20,
  },
  stateCard: {
    padding: 18,
    borderRadius: 16,
    background: "var(--bg)",
    color: "var(--muted)",
    textAlign: "center",
    boxShadow: "inset 4px 4px 10px var(--shadow-lo), inset -4px -4px 10px var(--shadow-hi)",
  },
  errorBox: {
    marginTop: 16,
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(239, 68, 68, 0.12)",
    color: "#b91c1c",
    fontWeight: 700,
  },
  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};