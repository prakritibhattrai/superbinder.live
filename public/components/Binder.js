// components/Binder.js
import { useRealTime } from '../composables/useRealTime.js';
import SessionSetup from './SessionSetup.js';
import DocumentSidebar from './DocumentSidebar.js';
import Viewer from './Viewer.js';
import ChatPanel from './ChatPanel.js';

export default {
  name: 'Binder',
  components: {
    SessionSetup,
    DocumentSidebar,
    Viewer,
    ChatPanel,
  },
  template: `
    <div class="flex flex-col h-screen bg-gray-900 text-white">
      <!-- Session Setup Modal -->
      <session-setup v-if="!sessionReady" @setup-complete="handleSetupComplete" />

      <!-- Main Layout -->
      <div v-if="sessionReady" class="flex flex-1 overflow-hidden">
        <!-- Left Sidebar (Documents) -->
        <div class="w-full md:w-1/4 lg:w-1/5 bg-gray-800 border-r border-gray-700 flex-shrink-0">
          <document-sidebar />
        </div>

        <!-- Middle Viewer (Tabbed) -->
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

        <!-- Right Chat Panel -->
        <div class="w-full md:w-1/3 lg:w-1/4 bg-gray-800 border-l border-gray-700 flex-shrink-0">
          <chat-panel />
        </div>
      </div>
    </div>
  `,
  setup() {
    const { sessionInfo, connect, isConnected, connectionError } = useRealTime();
    const sessionReady = Vue.ref(false);
    const activeTab = Vue.ref('Full');
    const viewerTabs = ['Full', 'Clips', 'Transcribe', 'Synthesize'];

    // Handle session setup completion
    function handleSetupComplete({ channel, name }) {
      connect(channel, name);
      sessionReady.value = true; // Show layout after setup
    }

    // Monitor connection status
    Vue.watch(isConnected, (connected) => {
      if (!connected && sessionReady.value) {
        console.warn('Connection lost:', connectionError.value);
        // Optionally trigger reconnect or show error UI
      }
    });

    Vue.onMounted(() => {
      // Check if session is pre-configured
      if (sessionInfo.value.userUuid && sessionInfo.value.channelName && sessionInfo.value.displayName) {
        connect(sessionInfo.value.channelName, sessionInfo.value.displayName);
        sessionReady.value = true;
      }
    });

    return {
      sessionReady,
      activeTab,
      viewerTabs,
      handleSetupComplete,
      sessionInfo,
      isConnected,
      connectionError,
    };
  },
};