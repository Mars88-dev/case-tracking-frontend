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

function resolveMessageActorId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || "";
  return "";
}

function resolveMessageKey(message) {
  if (!message) return "";
  return message._id || `${message.createdAt || ""}:${message.content || ""}`;
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
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1400
  );

  const token = localStorage.getItem("token");
  const messageEndRef = useRef(null);
  const latestConversationSnapshotRef = useRef({ userId: "", key: "" });
  const currentUserIdRef = useRef("");

  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  const dispatchUnreadRefresh = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("messages:refresh-unread"));
    }
  }, []);

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
    currentUserIdRef.current = resolveMessageActorId(meRes.data?._id || meRes.data?.id);

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

        const safeMessages = Array.isArray(res.data?.messages) ? res.data.messages : [];
        const safeConversationWith = res.data?.conversationWith || null;
        const latestMessage = safeMessages.length
          ? safeMessages[safeMessages.length - 1]
          : null;
        const latestMessageKey = resolveMessageKey(latestMessage);
        const latestSenderId = resolveMessageActorId(latestMessage?.senderId);
        const currentUserId = currentUserIdRef.current;
        const previousSnapshot = latestConversationSnapshotRef.current;
        const isSameConversation = previousSnapshot.userId === userId;
        const hasNewLatestMessage =
          isSameConversation &&
          !!previousSnapshot.key &&
          !!latestMessageKey &&
          previousSnapshot.key !== latestMessageKey;
        const isIncomingFromOtherUser =
          !!latestSenderId && !!currentUserId && latestSenderId !== currentUserId;

        setMessages(safeMessages);
        setSelectedUser(safeConversationWith);

        if (
          hasNewLatestMessage &&
          isIncomingFromOtherUser &&
          typeof window !== "undefined"
        ) {
          window.dispatchEvent(
            new CustomEvent("messages:incoming-live", {
              detail: {
                userId,
                username: safeConversationWith?.username || "Someone",
                body: latestMessage?.content || "You have a new message.",
              },
            })
          );
        }

        latestConversationSnapshotRef.current = {
          userId,
          key: latestMessageKey || "",
        };
        dispatchUnreadRefresh();
      } catch (err) {
        console.error("Failed to fetch conversation:", err);
        setPageError(err.response?.data?.message || "Failed to load conversation.");
      } finally {
        if (!silent) {
          setLoadingMessages(false);
        }
      }
    },
    [authHeaders, token, dispatchUnreadRefresh]
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
    if (typeof window === "undefined") return undefined;

    window.dispatchEvent(
      new CustomEvent("messages:active-conversation-change", {
        detail: { userId: selectedUserId || "" },
      })
    );

    return undefined;
  }, [selectedUserId]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("messages:active-conversation-change", {
            detail: { userId: "" },
          })
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedUserId) return undefined;

    const interval = setInterval(async () => {
      try {
        await fetchConversation(selectedUserId, { silent: true });
        await fetchSidebarData();
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

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, item) => sum + Number(item?.unreadCount || 0), 0);
  }, [conversations]);

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
      dispatchUnreadRefresh();
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
            <div style={styles.sidebarHeaderTop}>
              <div style={styles.sidebarHeroIcon}>💬</div>
              <div>
                <h1 style={styles.sidebarTitle}>Messages</h1>
                <p style={styles.sidebarSubtitle}>
                  Private staff messaging with popup alerts, sound notifications and unread badges
                </p>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{conversations.length}</div>
                <div style={styles.statLabel}>Active chats</div>
              </div>

              <div
                style={{
                  ...styles.statCard,
                  ...(totalUnread > 0 ? styles.statCardAlert : {}),
                }}
              >
                <div style={styles.statValue}>{totalUnread}</div>
                <div style={styles.statLabel}>Unread</div>
              </div>
            </div>
          </div>

          <div style={styles.searchWrap}>
            <div style={styles.searchShell}>
              <span style={styles.searchIcon}>🔎</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email"
                style={styles.searchInput}
              />
            </div>
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
                const hasUnread = unreadCount > 0;

                return (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    style={{
                      ...styles.userRow,
                      ...(hasUnread ? styles.userRowUnread : {}),
                      ...(isSelected ? styles.userRowSelected : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.avatar,
                        ...(hasUnread ? styles.avatarUnread : {}),
                      }}
                    >
                      {(user.username || "U").slice(0, 1).toUpperCase()}
                    </div>

                    <div style={styles.userMeta}>
                      <div style={styles.userTopRow}>
                        <div style={styles.userNameWrap}>
                          {hasUnread && <span style={styles.unreadDot} />}
                          <strong
                            style={{
                              ...styles.userName,
                              ...(hasUnread ? styles.userNameUnread : {}),
                            }}
                          >
                            {user.username}
                          </strong>
                        </div>

                        <div style={styles.userTopRight}>
                          {meta?.updatedAt && (
                            <span style={styles.userTime}>
                              {formatTimestamp(meta.updatedAt)}
                            </span>
                          )}
                          {hasUnread && <span style={styles.unreadPill}>{unreadCount}</span>}
                        </div>
                      </div>

                      <div style={styles.userEmail}>{user.email}</div>

                      <div
                        style={{
                          ...styles.userPreview,
                          ...(hasUnread ? styles.userPreviewUnread : {}),
                        }}
                      >
                        {previewText(meta?.lastMessage)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section
          style={{
            ...styles.conversationPane,
            ...(isCompact ? styles.conversationPaneCompact : {}),
          }}
        >
          {!selectedUserId ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>💬</div>
              <div>Select a user on the left to start a private conversation.</div>
            </div>
          ) : (
            <>
              <div style={styles.conversationHeader}>
                <div style={styles.conversationIdentity}>
                  <div style={styles.conversationAvatar}>
                    {(selectedUser?.username || "C").slice(0, 1).toUpperCase()}
                  </div>

                  <div>
                    <div style={styles.conversationTitleRow}>
                      <h2 style={styles.conversationTitle}>
                        {selectedUser?.username || "Conversation"}
                      </h2>

                      {selectedConversationMeta?.unreadCount > 0 && (
                        <div style={styles.headerUnreadBadge}>
                          🔔 {selectedConversationMeta.unreadCount} unread
                        </div>
                      )}
                    </div>

                    <div style={styles.conversationMeta}>
                      📧 {selectedUser?.email || "Loading user details…"}
                    </div>
                  </div>
                </div>

                <div style={styles.headerChips}>
                  <span style={styles.headerChip}>🔔 Alerts active</span>
                  <span style={styles.headerChipMuted}>🔊 Sound ready</span>
                </div>
              </div>

              {pageError && <div style={styles.errorBox}>{pageError}</div>}

              <div style={styles.messagesViewport}>
                {loadingMessages ? (
                  <div style={styles.stateCard}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={styles.stateCard}>
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine =
                      resolveMessageActorId(message.senderId) ===
                      resolveMessageActorId(currentUser?._id || currentUser?.id);
                    const senderLabel = isMine ? "You" : selectedUser?.username || "User";

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
                            ...styles.messageGroup,
                            alignItems: isMine ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              ...styles.messageSender,
                              ...(isMine ? styles.messageSenderMine : {}),
                            }}
                          >
                            {isMine ? "You" : `👤 ${senderLabel}`}
                          </div>

                          <div
                            style={{
                              ...styles.messageBubble,
                              ...(isMine
                                ? styles.messageBubbleMine
                                : styles.messageBubbleOther),
                            }}
                          >
                            <div style={styles.messageText}>{message.content}</div>

                            <div style={styles.messageMetaRow}>
                              <div style={styles.messageStamp}>
                                {formatTimestamp(message.createdAt)}
                              </div>

                              {isMine && message.readAt && (
                                <div style={styles.seenStamp}>Seen</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <form onSubmit={handleSend} style={styles.composeBar}>
                <div style={styles.composeHeader}>
                  <div style={styles.composeTitle}>✍️ Write a message</div>
                  <div style={styles.characterCount}>{draft.trim().length}/2000</div>
                </div>

                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Message ${selectedUser?.username || "this user"}…`}
                  style={styles.composeInput}
                  rows={3}
                  maxLength={2000}
                />

                <div style={styles.composeFooter}>
                  <div style={styles.composeHint}>🔒 Private internal chat</div>
                  <button
                    type="submit"
                    className="neumo-button"
                    disabled={sending || !draft.trim()}
                    style={sending || !draft.trim() ? styles.disabledButton : undefined}
                  >
                    {sending ? "Sending…" : "📨 Send Message"}
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
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--bg) 92%, white), var(--bg))",
    padding: 20,
  },
  backgroundGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top left, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 35%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 42%)",
    pointerEvents: "none",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1480,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "380px minmax(0, 1fr)",
    gap: 22,
    alignItems: "stretch",
  },
  shellCompact: {
    gridTemplateColumns: "1fr",
  },
  sidebar: {
    background: "var(--surface)",
    borderRadius: 24,
    padding: 20,
    boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 112px)",
    border: "1px solid color-mix(in srgb, var(--text) 6%, transparent)",
  },
  sidebarCompact: {
    minHeight: "auto",
  },
  sidebarHeader: {
    marginBottom: 18,
  },
  sidebarHeaderTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
  },
  sidebarHeroIcon: {
    width: 52,
    height: 52,
    minWidth: 52,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 90%, white), var(--color-primary))",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.12)",
  },
  sidebarTitle: {
    margin: 0,
    fontSize: 30,
    color: "var(--color-primary)",
    lineHeight: 1.1,
  },
  sidebarSubtitle: {
    margin: "8px 0 0",
    color: "var(--muted)",
    lineHeight: 1.55,
    fontSize: 14,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 18,
  },
  statCard: {
    borderRadius: 18,
    padding: 14,
    background: "var(--bg)",
    boxShadow: "inset 4px 4px 10px var(--shadow-lo), inset -4px -4px 10px var(--shadow-hi)",
  },
  statCardAlert: {
    border: "1px solid rgba(239, 68, 68, 0.2)",
    background: "color-mix(in srgb, #ef4444 7%, var(--bg))",
  },
  statValue: {
    fontSize: 26,
    fontWeight: 800,
    color: "var(--color-primary)",
    lineHeight: 1,
  },
  statLabel: {
    marginTop: 6,
    color: "var(--muted)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  searchWrap: {
    marginBottom: 16,
  },
  searchShell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    borderRadius: 16,
    border: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
    background: "var(--surface)",
    boxShadow: "inset 4px 4px 10px var(--shadow-lo), inset -4px -4px 10px var(--shadow-hi)",
  },
  searchIcon: {
    fontSize: 15,
    color: "var(--muted)",
    flexShrink: 0,
  },
  searchInput: {
    width: "100%",
    padding: "14px 0",
    border: "none",
    background: "transparent",
    color: "var(--text)",
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
    border: "1px solid transparent",
    borderRadius: 18,
    padding: 14,
    textAlign: "left",
    cursor: "pointer",
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "7px 7px 16px var(--shadow-lo), -7px -7px 16px var(--shadow-hi)",
  },
  userRowUnread: {
    border: "1px solid rgba(239, 68, 68, 0.18)",
    background:
      "linear-gradient(180deg, color-mix(in srgb, #ef4444 4%, var(--surface)), var(--surface))",
  },
  userRowSelected: {
    outline: "2px solid color-mix(in srgb, var(--color-accent) 75%, white)",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 9%, var(--surface)), var(--surface))",
  },
  avatar: {
    width: 50,
    height: 50,
    minWidth: 50,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    color: "#fff",
    fontWeight: 800,
    fontSize: 18,
    boxShadow: "0 10px 20px rgba(0,0,0,0.12)",
  },
  avatarUnread: {
    boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.14), 0 10px 20px rgba(0,0,0,0.12)",
  },
  userMeta: {
    minWidth: 0,
    flex: 1,
  },
  userTopRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  userTopRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  userNameWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "#ef4444",
    flexShrink: 0,
    boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.12)",
  },
  userName: {
    fontSize: 15,
    color: "var(--text)",
    lineHeight: 1.3,
  },
  userNameUnread: {
    fontWeight: 800,
    color: "#b91c1c",
  },
  userTime: {
    fontSize: 11,
    color: "var(--muted)",
    whiteSpace: "nowrap",
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
    lineHeight: 1.45,
  },
  userPreviewUnread: {
    color: "var(--text)",
    fontWeight: 700,
  },
  unreadPill: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    padding: "0 7px",
    background: "#ef4444",
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    boxShadow: "0 8px 18px rgba(239, 68, 68, 0.32)",
  },
  conversationPane: {
    background: "var(--surface)",
    borderRadius: 24,
    padding: 20,
    boxShadow: "10px 10px 24px var(--shadow-lo), -10px -10px 24px var(--shadow-hi)",
    minHeight: "calc(100vh - 112px)",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    border: "1px solid color-mix(in srgb, var(--text) 6%, transparent)",
  },
  conversationPaneCompact: {
    minHeight: "70vh",
  },
  conversationHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    paddingBottom: 18,
    borderBottom: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
    flexWrap: "wrap",
  },
  conversationIdentity: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },
  conversationAvatar: {
    width: 58,
    height: 58,
    minWidth: 58,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
    color: "#fff",
    fontWeight: 800,
    fontSize: 22,
    boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
  },
  conversationTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  conversationTitle: {
    margin: 0,
    color: "var(--color-primary)",
    fontSize: 28,
    lineHeight: 1.15,
  },
  conversationMeta: {
    marginTop: 6,
    color: "var(--muted)",
    fontSize: 14,
    wordBreak: "break-word",
  },
  headerChips: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  headerChip: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "color-mix(in srgb, var(--color-accent) 12%, var(--surface))",
    color: "var(--color-primary)",
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  headerChipMuted: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "var(--bg)",
    color: "var(--muted)",
    fontWeight: 700,
    fontSize: 12,
    whiteSpace: "nowrap",
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
    padding: "20px 6px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--bg) 55%, transparent), transparent)",
    borderRadius: 18,
    marginTop: 16,
    marginBottom: 16,
  },
  messageRow: {
    display: "flex",
    width: "100%",
  },
  messageGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxWidth: "78%",
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 800,
    color: "var(--muted)",
    padding: "0 4px",
  },
  messageSenderMine: {
    color: "var(--color-primary)",
  },
  messageBubble: {
    borderRadius: 22,
    padding: "14px 16px",
    boxShadow: "8px 8px 16px var(--shadow-lo), -8px -8px 16px var(--shadow-hi)",
  },
  messageBubbleMine: {
    background: "linear-gradient(135deg, var(--color-primary), #16365f)",
    color: "#fff",
    borderBottomRightRadius: 8,
  },
  messageBubbleOther: {
    background: "var(--surface)",
    color: "var(--text)",
    borderBottomLeftRadius: 8,
    border: "1px solid color-mix(in srgb, var(--text) 6%, transparent)",
  },
  messageText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.6,
    fontSize: 14,
  },
  messageMetaRow: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  messageStamp: {
    fontSize: 11,
    opacity: 0.82,
  },
  seenStamp: {
    fontSize: 11,
    fontWeight: 800,
    opacity: 0.92,
  },
  composeBar: {
    borderTop: "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
    paddingTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  composeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  composeTitle: {
    fontWeight: 800,
    color: "var(--color-primary)",
    fontSize: 15,
  },
  composeInput: {
    width: "100%",
    minHeight: 92,
    resize: "vertical",
    padding: 16,
    borderRadius: 18,
    border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "inset 4px 4px 10px var(--shadow-lo), inset -4px -4px 10px var(--shadow-hi)",
    fontSize: 14,
    outline: "none",
    lineHeight: 1.5,
  },
  composeFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  composeHint: {
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700,
  },
  characterCount: {
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700,
  },
  emptyState: {
    flex: 1,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: "var(--muted)",
    fontSize: 16,
    padding: 20,
    gap: 12,
  },
  emptyStateIcon: {
    fontSize: 36,
  },
  stateCard: {
    padding: 18,
    borderRadius: 18,
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