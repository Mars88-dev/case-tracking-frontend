// File: src/components/MessageBox.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaTrash } from "react-icons/fa";

const BASE_URL = "https://case-tracking-backend.onrender.com";
const COLORS = {
  primary: "#142a4f",
  accent: "#d2ac68",
  background: "#f5f5f5",
  white: "#ffff",
  gray: "#f9fafb",
  border: "#cbd5e1",
  gold: "#d2ac68",
  blue: "#142a4f"
};

export default function MessageBox({ caseId, onClose, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const token = localStorage.getItem("token");

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/cases/${caseId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        setMessages(res.data);
      } else {
        setMessages([]);
      }
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
      await axios.delete(
        `${BASE_URL}/api/cases/${caseId}/messages/${messageId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchMessages();
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };  

  useEffect(() => {
    fetchMessages();
  }, [caseId]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💬 Messages for this Transaction</h3>

      <div style={styles.messageList}>
        {Array.isArray(messages) && messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg._id} style={styles.messageItem}>
              <strong style={styles.username}>{msg.username}</strong>
              <div style={styles.content}>{msg.content}</div>
              <small style={styles.timestamp}>{new Date(msg.createdAt).toLocaleString()}</small>
              {currentUser?.username === msg.username && (
                <button onClick={() => handleDelete(msg._id)} style={styles.deleteBtn}>
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
        <button
          onClick={handleSubmit}
          style={styles.sendBtn}
        >
          ➤ Send
        </button>
        <button
          onClick={onClose}
          style={styles.closeBtn}
        >
          ✖ Close
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 50,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    width: 500,
    maxHeight: "80vh",
    overflowY: "auto",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    boxShadow: '6px 6px 12px #c8c9cc, -6px -6px 12px #ffffff', // Neumorphic card
    fontFamily: "Arial, sans-serif",
    background: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)' // Futuristic gradient
  },
  title: {
    marginTop: 0,
    color: COLORS.primary,
    fontSize: 20,
    marginBottom: 16
  },
  messageList: {
    maxHeight: "50vh",
    overflowY: "auto",
    marginBottom: 12
  },
  messageItem: {
    background: COLORS.background,
    padding: "10px 12px",
    marginBottom: 10,
    borderRadius: 12,
    position: "relative",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff', // Neumorphic message card
    transition: 'box-shadow 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } // Gold hover glow
  },
  username: {
    color: COLORS.primary,
    fontWeight: "bold"
  },
  content: {
    marginTop: 4,
    marginBottom: 6
  },
  timestamp: {
    color: "#555",
    fontSize: 12
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#e53e3e",
    transition: 'color 0.3s ease',
    ':hover': { color: "#b02a2a" }
  },
  noMessages: {
    color: COLORS.primary,
    textAlign: "center"
  },
  textarea: {
    width: "100%",
    padding: 10,
    border: 'none',
    borderRadius: 12,
    background: COLORS.background,
    boxShadow: 'inset 3px 3px 6px #c8c9cc, inset -3px -3px 6px #ffffff', // Inset neumorphic
    marginBottom: 16,
    resize: "none",
    fontSize: 14,
    transition: 'box-shadow 0.3s ease',
    ':focus': { boxShadow: 'inset 3px 3px 6px #b08e4e, inset -3px -3px 6px #f4ca86' } // Gold focus
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-between"
  },
  sendBtn: {
    background: COLORS.primary,
    color: COLORS.white,
    padding: "8px 18px",
    border: "none",
    borderRadius: 12,
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff', // Neumorphic
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #0f1f3d, inset -3px -3px 6px #193b61', transform: 'translateY(2px)' } // Press effect
  },
  closeBtn: {
    background: "#e53e3e",
    color: "#fff",
    padding: "8px 18px",
    border: "none",
    borderRadius: 12,
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: '3px 3px 6px #c8c9cc, -3px -3px 6px #ffffff',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    ':hover': { boxShadow: 'inset 3px 3px 6px #b02a2a, inset -3px -3px 6px #f45a5a', transform: 'translateY(2px)' }
  }
};