// composables/useChat.js
import { useRealTime } from './useRealTime.js';

const messages = Vue.ref([]);
const { emit, on, off, activeUsers, userUuid } = useRealTime();

// Store event handlers per instance to prevent duplicates
const eventHandlers = new WeakMap();

export function useChat() {
  // Initialize handlers only if not already set for this instance
  if (!eventHandlers.has(useChat)) {
    const handlers = {};

    function handleDraft({ userUuid: senderUuid, text }) {
      const existing = messages.value.find(m => m.userUuid === senderUuid && m.isDraft);
      if (existing) {
        existing.text = `Pending: ${text}`; // Prefix "Pending" to drafts
      } else {
        messages.value.push({ 
          id: uuidv4(), 
          userUuid: senderUuid, 
          text: `Pending: ${text}`, 
          isDraft: true, 
          timestamp: Date.now(),
          color: getUserColor(senderUuid) || '#FFFFFF', // Assign color to drafts
        });
      }
    }

    function handleMessage({ userUuid: senderUuid, text, color }) {
      // Ensure color is set, even if not provided by the server
      const finalColor = color || getUserColor(senderUuid) || generateRandomColor();
      messages.value = messages.value.filter(m => !(m.userUuid === senderUuid && m.isDraft));
      messages.value.push({ 
        id: uuidv4(), 
        userUuid: senderUuid, 
        text, 
        isDraft: false, 
        color: finalColor, 
        timestamp: Date.now(),
      });
    }

    function handleAgentMessage({ agentId, text, color }) {
      messages.value.push({ 
        id: uuidv4(), 
        userUuid: agentId, 
        text, 
        isDraft: false, 
        color: color || '#808080', // Default gray for agents
        timestamp: Date.now(),
      });
    }

    function handleSnapshot(history) {
      messages.value = (history.messages || []).map(msg => ({
        ...msg,
        color: msg.color || getUserColor(msg.userUuid) || generateRandomColor(),
      }));
    }

    function handleUserJoined(data) {
      // Ensure new users have a color in activeUsers
      if (!activeUsers.value[data.userUuid]?.color) {
        activeUsers.value = {
          ...activeUsers.value,
          [data.userUuid]: {
            ...activeUsers.value[data.userUuid],
            color: activeUsers.value[data.userUuid]?.color || generateRandomColor(),
          },
        };
      }
    }

    // Register event listeners and store handlers
    handlers.draft = on('chat-draft', handleDraft);
    handlers.message = on('chat-message', handleMessage);
    handlers.agentMessage = on('agent-message', handleAgentMessage);
    handlers.snapshot = on('history-snapshot', handleSnapshot);
    handlers.userJoined = on('user-joined', handleUserJoined);

    eventHandlers.set(useChat, handlers);
  }

  const handlers = eventHandlers.get(useChat);

  function sendMessage(text) {
    if (text.trim()) {
      const color = getUserColor(userUuid.value) || generateRandomColor(); // Ensure sender has a color
      emit('chat-message', { text, color });
    }
  }

  function updateDraft(text) {
    emit('chat-draft', { text });
  }

  // Helper to get or generate a user's color
  function getUserColor(userUuid) {
    return activeUsers.value[userUuid]?.color;
  }

  // Generate a random color for users
  function generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Cleanup function for components to call
  function cleanup() {
    const handlers = eventHandlers.get(useChat);
    if (handlers) {
      off('chat-draft', handlers.draft);
      off('chat-message', handlers.message);
      off('agent-message', handlers.agentMessage);
      off('history-snapshot', handlers.snapshot);
      off('user-joined', handlers.userJoined);
      eventHandlers.delete(useChat);
    }
  }

  return { messages, sendMessage, updateDraft, activeUsers, cleanup };
}