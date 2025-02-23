// components/ChatPanel.js
import { useChat } from '../composables/useChat.js';

export default {
  name: 'ChatPanel',
  template: `
    <div class="h-full flex flex-col p-4">
      <h3 class="text-lg font-semibold text-purple-400 mb-4">Chat</h3>
      <div
        ref="chatContainer"
        class="flex-1 overflow-auto mb-4"
        @scroll="handleScroll"
      >
        <div
          v-for="msg in messages"
          :key="msg.id"
          :style="{ backgroundColor: msg.isDraft ? '#4B5563' : msg.color + '33' }"
          class="p-2 mb-2 rounded-lg flex flex-col"
        >
          <span class="font-semibold">
            {{ activeUsers[msg.userUuid]?.displayName || (msg.userUuid.startsWith('agent-') ? 'AI Agent' : 'Unknown') }}:
          </span>
          <span>{{ msg.text }}</span>
          <span class="text-xs text-gray-400">{{ formatTime(msg.timestamp) }}</span>
        </div>
      </div>
      <div class="flex gap-2">
        <input
          v-model="draft"
          @input="updateDraft"
          @keypress.enter="sendMessage"
          type="text"
          class="flex-1 p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500"
          placeholder="Type a message..."
        />
        <button
          @click="sendMessage"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  `,
  setup() {
    const { messages, sendMessage, updateDraft, activeUsers } = useChat();
    const draft = Vue.ref('');
    const chatContainer = Vue.ref(null);
    const isAutoScrollEnabled = Vue.ref(true); // Track if auto-scroll is active

    function send() {
      if (draft.value.trim()) {
        sendMessage(draft.value);
        draft.value = '';
      }
    }

    function formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString();
    }

    // Handle scrolling to control auto-scroll behavior
    function handleScroll() {
      if (!chatContainer.value) return;

      const container = chatContainer.value;
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 5; // Allow slight buffer

      if (isAtBottom) {
        isAutoScrollEnabled.value = true; // Re-enable auto-scroll when scrolled to bottom
      } else {
        isAutoScrollEnabled.value = false; // Disable auto-scroll if scrolled up
      }
    }

    // Auto-scroll to bottom when new messages arrive, if enabled
    Vue.watch(messages, () => {
      if (chatContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        });
      }
    }, { deep: true });

    return {
      messages,
      draft,
      sendMessage: send,
      updateDraft: () => updateDraft(draft.value),
      activeUsers,
      formatTime,
      chatContainer,
      handleScroll
    };
  },
};