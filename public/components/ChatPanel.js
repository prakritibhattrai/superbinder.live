// components/ChatPanel.js
import { useChat } from '../composables/useChat.js';

export default {
  name: 'ChatPanel',
  template: `
    <div class="h-full flex flex-col p-4">
      <h3 class="text-lg font-semibold text-purple-400 mb-4">Chat</h3>
      <div class="flex-1 overflow-auto mb-4">
        <div v-for="msg in messages" :key="msg.id" :style="{ backgroundColor: msg.isDraft ? '#4B5563' : msg.color + '33' }" class="p-2 mb-2 rounded-lg">
          <span class="font-semibold">{{ activeUsers[msg.userUuid]?.displayName || 'Unknown' }}:</span>
          {{ msg.text }}
        </div>
      </div>
      <input
        v-model="draft"
        @input="updateDraft"
        @keypress.enter="sendMessage"
        type="text"
        class="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600"
        placeholder="Type a message..."
      />
    </div>
  `,
  setup() {
    const { messages, sendMessage, updateDraft, activeUsers } = useChat();
    const draft = Vue.ref('');

    function send() {
      if (draft.value.trim()) {
        sendMessage(draft.value);
        draft.value = '';
      }
    }

    return {
      messages,
      draft,
      sendMessage: send,
      updateDraft: () => updateDraft(draft.value),
      activeUsers,
    };
  },
};