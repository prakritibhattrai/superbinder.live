// composables/useChat.js
import { useRealTime } from './useRealTime.js';

const messages = Vue.ref([]);
const { emit, on, off, activeUsers, userUuid } = useRealTime();

export function useChat() {
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

  on('chat-draft', handleDraft);
  on('chat-message', handleMessage);
  on('agent-message', handleAgentMessage);
  on('history-snapshot', handleSnapshot);
  on('user-joined', handleUserJoined);

  Vue.onUnmounted(() => {
    off('chat-draft', handleDraft);
    off('chat-message', handleMessage);
    off('agent-message', handleAgentMessage);
    off('history-snapshot', handleSnapshot);
    off('user-joined', handleUserJoined);
  });

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

  return { messages, sendMessage, updateDraft, activeUsers };
}