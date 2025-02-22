// components/Binder.js
import { useRealTime } from '../composables/useRealTime.js';
import SessionSetup from './SessionSetup.js';
import DocumentSidebar from './DocumentSidebar.js';
import Viewer from './Viewer.js';
import ChatPanel from './ChatPanel.js';

export default {
  name: 'Binder',
  components: { SessionSetup, DocumentSidebar, Viewer, ChatPanel },
  template: `
    <div class="flex flex-col h-screen bg-gray-900 text-white">
      <session-setup v-if="!sessionReady" @setup-complete="handleSetupComplete" />
      <div v-if="sessionReady" class="flex flex-col">
        <!-- Reset Button -->
        <div class="bg-gray-800 p-4 border-b border-gray-700 flex justify-end">
          <button
            @click="resetSession"
            class="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Reset Session
          </button>
        </div>
        <div class="flex flex-1 overflow-hidden">
          <div class="w-full md:w-1/4 lg:w-1/5 bg-gray-800 border-r border-gray-700 flex-shrink-0">
            <document-sidebar />
          </div>
          <div class="flex-1 flex flex-col overflow-hidden">
            <div class="bg-gray-800 border-b border-gray-700 px-4 py-2 flex gap-2">
              <button
                v-for="tab in viewerTabs"
                :key="tab"
                @click="activeTab = tab"
                :class="[
                  'px-4 py-2 rounded-t-lg font-semibold transition-colors',
                  activeTab === tab ? 'bg-gray-900 text-purple-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                ]"
              >
                {{ tab }}
              </button>
            </div>
            <div class="flex-1 overflow-auto">
              <viewer :active-tab="activeTab" />
            </div>
          </div>
          <div class="w-full md:w-1/3 lg:w-1/4 bg-gray-800 border-l border-gray-700 flex-shrink-0">
            <chat-panel />
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const { sessionInfo, connect, loadSession, disconnect, isConnected, connectionError } = useRealTime();
    const sessionReady = Vue.ref(false);
    const activeTab = Vue.ref('Full');
    const viewerTabs = ['Full', 'Clips', 'Transcribe', 'Synthesize'];

    function handleSetupComplete({ channel, name }) {
      connect(channel, name);
      sessionReady.value = true;
    }

    function resetSession() {
      disconnect(); // Clean up socket connection
      localStorage.removeItem('userUuid');
      localStorage.removeItem('displayName');
      localStorage.removeItem('channelName');
      userUuid.value = null; // Reset reactive state
      displayName.value = '';
      channelName.value = '';
      sessionReady.value = false; // Show session setup again
    }

    Vue.watch(isConnected, (connected) => {
      if (!connected && sessionReady.value) {
        console.warn('Connection lost:', connectionError.value);
      }
    });

    Vue.onMounted(() => {
      if (sessionInfo.value.userUuid && sessionInfo.value.channelName && sessionInfo.value.displayName) {
        loadSession(); // Explicitly reload session
        sessionReady.value = true;
      }
    });

    // Expose reactive states for reset
    const { userUuid, displayName, channelName } = useRealTime();

    return {
      sessionReady,
      activeTab,
      viewerTabs,
      handleSetupComplete,
      resetSession,
      sessionInfo,
      isConnected,
      connectionError,
      userUuid,
      displayName,
      channelName,
    };
  },
};