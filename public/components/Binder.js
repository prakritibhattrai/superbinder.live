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
    <div class="flex flex-col min-h-screen bg-gray-950 text-white overflow-hidden p-2">
      <session-setup v-if="!sessionReady" @setup-complete="handleSetupComplete" />
      <div v-if="sessionReady" class="flex flex-col h-full">
        <!-- Menu Bar -->
        <div class="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between text-sm">
          <div class="flex items-center space-x-2">
            <span class="text-lg font-semibold text-white">Channel: {{ channelName }}</span>
            <span class="text-gray-300">({{ participantCount }} participants)</span>
          </div>
          <div class="flex items-center space-x-2">
            <button
              @click="resetSession"
              class="p-2 text-white hover:text-purple-400"
              title="Reset Session"
            >
              <i class="pi pi-refresh text-xl"></i>
            </button>
            <button
              @click="toggleRoomLock"
              class="p-2 text-white hover:text-purple-400"
              :class="{ 'text-green-500': !isRoomLocked, 'text-red-500': isRoomLocked }"
              title="Toggle Room Lock"
            >
              <i class="pi pi-lock text-xl"></i>
            </button>
            <button
              @click="uploadToCloud"
              class="p-2 text-white hover:text-purple-400"
              title="Upload to Cloud"
            >
              <i class="pi pi-cloud-upload text-xl"></i>
            </button>
            <button
              @click="downloadFromCloud"
              class="p-2 text-white hover:text-purple-400"
              title="Download from Cloud"
            >
              <i class="pi pi-cloud-download text-xl"></i>
            </button>
          </div>
        </div>
        <div class="flex flex-col md:flex-row flex-1 overflow-hidden">
          <!-- Documents Column (Sidebar) -->
          <div class="w-full md:w-1/4 lg:w-1/5 bg-gray-900 border-r border-gray-700 flex-shrink-0 overflow-y-auto" 
               :style="{ maxHeight: 'calc(100vh - 200px)' }">
            <document-sidebar />
          </div>
          <!-- Viewer Column -->
          <div class="flex-1 flex flex-col overflow-hidden">
            <div class="bg-gray-900 border-b border-gray-700 px-4 py-2 flex gap-2">
              <button
                v-for="tab in viewerTabs"
                :key="tab"
                @click="activeTab = tab"
                :class="[
                  'px-4 py-2 rounded-t-lg font-semibold transition-colors',
                  activeTab === tab ? 'bg-gray-800 text-purple-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                ]"
              >
                {{ tab }}
              </button>
            </div>
            <div class="flex-1 overflow-y-auto" :style="{ maxHeight: 'calc(100vh - 200px)' }">
              <viewer :active-tab="activeTab" />
            </div>
          </div>
          <!-- Chat Column -->
          <div class="w-full md:w-1/3 lg:w-1/4 bg-gray-900 border-l border-gray-700 flex-shrink-0 overflow-y-auto" 
               :style="{ maxHeight: 'calc(100vh - 200px)' }">
            <chat-panel />
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const { sessionInfo, connect, loadSession, disconnect, isConnected, connectionError, activeUsers, emit, on, off } = useRealTime();
    const sessionReady = Vue.ref(false);
    const activeTab = Vue.ref('Full');
    const viewerTabs = ['Full', 'Clips', 'Transcribe', 'Synthesize'];
    const isRoomLocked = Vue.ref(false); // Track room lock state
    const { userUuid, displayName, channelName } = useRealTime();

    // Calculate participant count from activeUsers
    const participantCount = Vue.computed(() => Object.keys(activeUsers.value || {}).length);

    function handleSetupComplete({ channel, name }) {
      connect(channel, name);
      sessionReady.value = true;
    }

    function resetSession() {
      disconnect();
      localStorage.removeItem('userUuid');
      localStorage.removeItem('displayName');
      localStorage.removeItem('channelName');
      userUuid.value = null;
      displayName.value = '';
      channelName.value = '';
      sessionReady.value = false;
      isRoomLocked.value = false; // Reset room lock on session reset
    }

    function toggleRoomLock() {
      isRoomLocked.value = !isRoomLocked.value;
      emit('room-lock-toggle', { channelName: channelName.value, locked: isRoomLocked.value });
    }

    function uploadToCloud() {
      console.log('Uploading channel data to cloud:', {
        channelName: channelName.value,
        participants: activeUsers.value,
        // Add documents, clips, messages, etc., from useDocuments, useClips, useChat
      });
      // Implement backend integration here (e.g., fetch or axios POST to /api/channel/save)
    }

    function downloadFromCloud() {
      console.log('Downloading channel data from cloud for:', channelName.value);
      // Implement backend integration here (e.g., fetch or axios GET from /api/channel/load)
    }

    function handleRoomLockToggle(data) {
      if (data.channelName === channelName.value) {
        isRoomLocked.value = data.locked;
      }
    }

    on('room-lock-toggle', handleRoomLockToggle);

    Vue.onUnmounted(() => {
      off('room-lock-toggle', handleRoomLockToggle);
    });

    Vue.watch(isConnected, (connected) => {
      if (!connected && sessionReady.value) {
        console.warn('Connection lost:', connectionError.value);
      }
    });

    Vue.onMounted(() => {
      if (sessionInfo.value.userUuid && sessionInfo.value.channelName && sessionInfo.value.displayName) {
        loadSession();
        sessionReady.value = true;
      }
    });

    // Handle resize to maintain layout
    Vue.onMounted(() => {
      const handleResize = () => {
        const binder = document.querySelector('.min-h-screen');
        if (binder) {
          const headerHeight = binder.querySelector('.bg-gray-800')?.offsetHeight || 56; // Approximate header height
          const contentHeight = `calc(100vh - ${headerHeight + 200}px)`; // Subtract header + 200px for bottom visibility
          document.querySelectorAll('.overflow-y-auto').forEach(el => {
            el.style.maxHeight = contentHeight;
          });
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize(); // Set initial height

      Vue.onUnmounted(() => {
        window.removeEventListener('resize', handleResize);
      });
    });

    return {
      sessionReady,
      activeTab,
      viewerTabs,
      handleSetupComplete,
      resetSession,
      toggleRoomLock,
      uploadToCloud,
      downloadFromCloud,
      sessionInfo,
      isConnected,
      connectionError,
      channelName,
      participantCount,
      isRoomLocked,
    };
  },
};