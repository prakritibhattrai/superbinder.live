// composables/useChat.js
import { useRealTime } from './useRealTime.js';

const messages = Vue.ref([]);
const { emit, on, off, activeUsers, userUuid } = useRealTime();

export function useChat() {
  function handleDraft({ userUuid: senderUuid, text }) {
    const existing = messages.value.find(m => m.userUuid === senderUuid && m.isDraft);
    if (existing) {
      existing.text = text;
    } else {
      messages.value.push({ id: uuidv4(), userUuid: senderUuid, text, isDraft: true, timestamp: Date.now() });
    }
  }

  function handleMessage({ userUuid: senderUuid, text, color }) {
    messages.value = messages.value.filter(m => !(m.userUuid === senderUuid && m.isDraft));
    messages.value.push({ id: uuidv4(), userUuid: senderUuid, text, isDraft: false, color, timestamp: Date.now() });
  }

  function handleAgentMessage({ agentId, text, color }) {
    messages.value.push({ id: uuidv4(), userUuid: agentId, text, isDraft: false, color, timestamp: Date.now() });
  }

  function handleSnapshot(history) {
    messages.value = history.messages || [];
  }

  on('chat-draft', handleDraft);
  on('chat-message', handleMessage);
  on('agent-message', handleAgentMessage);
  on('history-snapshot', handleSnapshot);

  Vue.onUnmounted(() => {
    off('chat-draft', handleDraft);
    off('chat-message', handleMessage);
    off('agent-message', handleAgentMessage);
    off('history-snapshot', handleSnapshot);
  });

  function sendMessage(text) {
    if (text.trim()) {
      const color = activeUsers.value[userUuid.value]?.color || '#FFFFFF';
      emit('chat-message', { text, color });
    }
  }

  function updateDraft(text) {
    emit('chat-draft', { text });
  }

  return { messages, sendMessage, updateDraft, activeUsers };
}