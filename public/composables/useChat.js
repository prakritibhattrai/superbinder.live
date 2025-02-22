// composables/useChat.js
import { useRealTime } from './useRealTime.js';

const messages = Vue.ref([]);
const { emit, on, activeUsers } = useRealTime();

export function useChat() {
  on('chat-draft', ({ userUuid, text }) => {
    const existing = messages.value.find(m => m.userUuid === userUuid && m.isDraft);
    if (existing) {
      existing.text = text;
    } else {
      messages.value.push({ id: uuidv4(), userUuid, text, isDraft: true, timestamp: Date.now() });
    }
  });
  on('chat-message', ({ userUuid, text, color }) => {
    messages.value = messages.value.filter(m => !(m.userUuid === userUuid && m.isDraft));
    messages.value.push({ id: uuidv4(), userUuid, text, isDraft: false, color, timestamp: Date.now() });
  });
  on('agent-message', ({ agentId, text, color }) => {
    messages.value.push({ id: uuidv4(), userUuid: agentId, text, isDraft: false, color, timestamp: Date.now() });
  });

  function sendMessage(text) {
    emit('chat-message', { text });
  }

  function updateDraft(text) {
    emit('chat-draft', { text });
  }

  return { messages, sendMessage, updateDraft, activeUsers };
}