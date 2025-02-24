// components/ChatPanel.js
import { useChat } from '../composables/useChat.js';

export default {
  name: 'ChatPanel',
  template: `
    <div
      v-if="isOpen"
      class="chat-panel fixed right-0 bg-gray-900 border-l border-gray-700 shadow-lg flex flex-col transform transition-transform duration-300"
      :class="{ 'translate-x-full': !isOpen, 'z-50 inset-0 bg-black bg-opacity-50 flex justify-end': isMobile, 'absolute top-0': !isMobile }"
      :style="{
        width: isMobile ? '100%' : width + 'px',
        height: isMobile ? 'calc(100vh - 96px)' : 'calc(100vh - 200px)',   
        maxHeight: isMobile ? 'calc(100vh - 96px)' : 'calc(100vh - 200px)'  
      }"
    >
      <!-- Mobile Inner Container -->
      <div v-if="isMobile" class="bg-gray-900 h-full w-full border-l border-gray-700 shadow-lg flex flex-col">
        <div class="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-purple-400">Chat</h3>
          <button @click="closeChat" class="text-white hover:text-red-400">
            <i class="pi pi-times text-xl"></i>
          </button>
        </div>
        <div ref="chatContainer" class="flex-1 overflow-y-auto p-4" @scroll="handleScroll">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :style="{ backgroundColor: msg.isDraft ? '#4B5563' : msg.color + '33' }"
            class="p-2 mb-2 rounded-lg flex flex-col"
          >
            <span class="font-semibold text-white">
              {{ activeUsers[msg.userUuid]?.displayName || (msg.userUuid.startsWith('agent-') ? 'AI Agent' : 'Unknown') }}:
            </span>
            <span class="text-white">{{ msg.text }}</span>
            <span class="text-gray-400 text-xs">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div v-if="!messages.length" class="text-gray-400">No messages yet.</div>
        </div>
        <div class="p-4 border-t border-gray-700 flex gap-2 items-center">
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
      <!-- Desktop Content -->
      <template v-else>
        <div class="p-2 border-b border-gray-700 flex justify-between items-center relative">
          <h3 class="text-lg font-semibold text-purple-400">Chat</h3>
          <button @click="closeChat" class="text-white hover:text-red-400">
            <i class="pi pi-times text-xl"></i>
          </button>
          <!-- Draggable Handle -->
          <div
            class="absolute left-0 top-0 h-full w-4 cursor-col-resize bg-transparent"
            @mousedown="startResize"
            @touchstart="startResize"
          ></div>
        </div>
        <div ref="chatContainer" class="flex-1 overflow-y-auto p-2" @scroll="handleScroll">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :style="{ backgroundColor: msg.isDraft ? '#4B5563' : msg.color + '33' }"
            class="p-2 mb-2 rounded-lg flex flex-col"
          >
            <span class="font-semibold text-white">
              {{ activeUsers[msg.userUuid]?.displayName || (msg.userUuid.startsWith('agent-') ? 'AI Agent' : 'Unknown') }}:
            </span>
            <span class="text-white">{{ msg.text }}</span>
            <span class="text-gray-400 text-xs">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div v-if="!messages.length" class="text-gray-400">No messages yet.</div>
        </div>
        <div class="p-2 border-t border-gray-700 flex gap-2 items-center">
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
      </template>
    </div>
  `,
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    isMobile: {
      type: Boolean,
      required: true,
    },
    width: {
      type: Number,
      default: 300,
    },
  },
  emits: ['close', 'update:width'],
  setup(props, { emit }) {
    const { messages, sendMessage, updateDraft, activeUsers } = useChat();
    const draft = Vue.ref('');
    const chatContainer = Vue.ref(null);
    const isAutoScrollEnabled = Vue.ref(true);

    function send() {
      if (draft.value.trim()) {
        sendMessage(draft.value);
        draft.value = '';
      }
    }

    function formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString();
    }

    function closeChat() {
      emit('close');
    }

    function handleScroll() {
      if (!chatContainer.value) return;
      const container = chatContainer.value;
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 5;
      if (isAtBottom) {
        isAutoScrollEnabled.value = true;
      } else {
        isAutoScrollEnabled.value = false;
      }
    }

    Vue.watch(messages, () => {
      if (chatContainer.value && isAutoScrollEnabled.value) {
        Vue.nextTick(() => {
          chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        });
      }
    }, { deep: true });

    let startX = 0;
    let startWidth = 0;

    function startResize(event) {
      startX = event.type === 'mousedown' ? event.pageX : event.touches[0].pageX;
      startWidth = props.width;
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
      document.addEventListener('touchmove', resize);
      document.addEventListener('touchend', stopResize);
    }

    function resize(event) {
      const x = event.type === 'mousemove' ? event.pageX : event.touches[0].pageX;
      const diff = x - startX;
      const newWidth = Math.max(200, startWidth - diff);
      emit('update:width', newWidth);
    }

    function stopResize() {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      document.removeEventListener('touchmove', resize);
      document.removeEventListener('touchend', stopResize);
    }

    Vue.onUnmounted(() => {
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
      document.removeEventListener('touchmove', resize);
      document.removeEventListener('touchend', stopResize);
    });

    return {
      messages,
      draft,
      sendMessage: send,
      updateDraft: () => updateDraft(draft.value),
      activeUsers,
      formatTime,
      chatContainer,
      handleScroll,
      closeChat,
      startResize,
    };
  },
};