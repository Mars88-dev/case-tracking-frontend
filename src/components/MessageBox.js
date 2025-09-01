// File: src/components/MessageBox.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaTrash } from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";

export default function MessageBox({ caseId, onClose, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const token = localStorage.getItem("token");

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/cases/${caseId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleSubmit = async () => {
    if (!newMessage.trim()) return;
    try {
      await axios.post(
        `${BASE_URL}/api/cases/${caseId}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await axios.delete(`${BASE_URL}/api/cases/${caseId}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMessages();
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  return (
    <div style={styles.backdrop}>
      <div style={styles.container}>
        <h3 style={styles.title}>💬 Messages for this Transaction</h3>

        <div style={styles.messageList}>
          {messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg._id} style={styles.messageItem}>
                <strong style={styles.username}>{msg.username}</strong>
                <div style={styles.content}>{msg.content}</div>
                <small style={styles.timestamp}>
                  {new Date(msg.createdAt).toLocaleString()}
                </small>
                {currentUser?.username === msg.username && (
                  <button onClick={() => handleDelete(msg._id)} style={styles.deleteBtn} title="Delete">
                    <FaTrash />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p style={styles.noMessages}>No messages yet.</p>
          )}
        </div>

        <textarea
          rows={3}
          placeholder="Type your message here..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={styles.textarea}
        />

        <div style={styles.buttonRow}>
          <button onClick={handleSubmit} className="neumo-button">
            ➤ Send
          </button>
          <button onClick={onClose} className="neumo-button" style={{ background: "#e53e3e" }}>
            ✖ Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "grid",
    placeItems: "center",
    zIndex: 9998,
  },
  container: {
    width: 520,
    maxWidth: "90vw",
    maxHeight: "80vh",
    overflowY: "auto",
    background: "var(--surface)",
    color: "var(--text)",
    borderRadius: 16,
    padding: 24,
    boxShadow: "6px 6px 12px var(--shadow-lo), -6px -6px 12px var(--shadow-hi)",
    zIndex: 9999,
  },
  title: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 20,
    fontWeight: 800,
    color: "var(--text)",
  },
  messageList: {
    maxHeight: "50vh",
    overflowY: "auto",
    marginBottom: 12,
  },
  messageItem: {
    background: "var(--bg)",
    padding: "10px 12px",
    marginBottom: 10,
    borderRadius: 12,
    position: "relative",
    boxShadow: "3px 3px 6px var(--shadow-lo), -3px -3px 6px var(--shadow-hi)",
  },
  username: { color: "var(--color-accent)", fontWeight: 800 },
  content: { marginTop: 4, marginBottom: 6, fontWeight: 600 },
  timestamp: { color: "var(--muted)", fontSize: 12 },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#ef4444",
  },
  noMessages: { color: "var(--muted)", textAlign: "center" },
  textarea: {
    width: "100%",
    padding: 10,
    border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
    borderRadius: 12,
    background: "var(--surface)",
    color: "var(--text)",
    boxShadow: "inset 3px 3px 6px var(--shadow-lo), inset -3px -3px 6px var(--shadow-hi)",
    marginBottom: 16,
    resize: "none",
    fontSize: 14,
  },
  buttonRow: { display: "flex", justifyContent: "space-between" },
};
