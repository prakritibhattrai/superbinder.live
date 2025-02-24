// components/Binder.js
import { useRealTime } from '../composables/useRealTime.js';
import SessionSetup from './SessionSetup.js';
import Uploads from './Uploads.js'; // Renamed DocumentSidebar.js
import Viewer from './Viewer.js';
import ChatPanel from './ChatPanel.js';

export default {
  name: 'Binder',
  components: { SessionSetup, Uploads, Viewer, ChatPanel },
  template: `
    <div class="flex flex-col min-h-screen bg-gray-950 text-white p-2 overflow-x-hidden" style="height: 100vh;">
      <session-setup v-if="!sessionReady" @setup-complete="handleSetupComplete" />

      <div v-if="sessionReady" class="flex flex-col h-full relative">
        <!-- Menu Bar -->
        <div class="bg-gray-800 p-2 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
          <div class="flex items-center space-x-2">
            <span class="text-lg font-semibold text-gray-100">Channel: '{{ channelName }}' ({{ participantCount }} participants)</span>
          </div>
          <div class="flex items-center space-x-2 sm:ml-auto">
            <button @click="resetSession" class="p-2 text-white hover:text-purple-400" title="Reset Session">
              <i class="pi pi-refresh text-xl"></i>
            </button>
            <button @click="toggleRoomLock" class="p-2 text-white hover:text-purple-400" :class="{ 'text-green-500': !isRoomLocked, 'text-red-500': isRoomLocked }" title="Toggle Room Lock">
              <i v-if = "!isRoomLocked" class="pi pi-unlock text-xl"></i>
              <i v-if = "isRoomLocked" class="pi pi-lock text-xl"></i>
            </button>
            <button @click="uploadToCloud" class="p-2 text-white hover:text-purple-400" title="Upload to Cloud">
              <i class="pi pi-cloud-upload text-xl"></i>
            </button>
            <button @click="downloadFromCloud" class="p-2 text-white hover:text-purple-400" title="Download from Cloud">
              <i class="pi pi-cloud-download text-xl"></i>
            </button>
          </div>
        </div>

        <!-- Tab Bar with Chat Icon -->
        <div class="bg-gray-900 border-b border-gray-700 px-4 py-2 relative flex items-center">
          <div class="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              v-for="tab in tabs"
              :key="tab"
              @click="activeTab = tab; updateActiveTab(tab)"
              class="px-4 py-2 rounded-t-lg font-semibold transition-colors whitespace-nowrap"
              :class="[
                activeTab === tab ? 'bg-gray-800 text-purple-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              ]"
            >
              {{ tab }}
            </button>
          </div>

          <!-- Chat Icon (Visible on desktop, hidden on mobile) -->
          <button
            @click="toggleChat"
            class="ml-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors hidden sm:inline-flex"
            :class="{ 'bg-gray-800 text-purple-400': isChatOpen }"
          >
            <i class="pi pi-comments text-xl"></i>
          </button>
        </div>

        <!-- Main Content -->
        <div class="flex flex-1 flex-col overflow-hidden relative" style="height: 100%;">
          <!-- Document Sub-Tabs (only when Documents tab is active) -->
          <div v-show="activeTab === 'Documents'" class="bg-gray-900 border-b border-gray-700 px-4 py-2">
            <div class="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                v-for="subTab in documentSubTabs"
                :key="subTab"
                @click="activeDocumentSubTab = subTab; updateActiveTab('Documents')"
                class="px-4 py-2 rounded-t-lg font-semibold transition-colors whitespace-nowrap"
                :class="[
                  activeDocumentSubTab === subTab ? 'bg-gray-800 text-purple-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                ]"
              >
                {{ subTab }}
              </button>
            </div>
          </div>

          <!-- Viewer (Keep all components mounted with v-show) -->
          <div class="flex-1 overflow-y-auto" :style="{ maxHeight: 'calc(100vh - 180px)' }">
            <viewer
              :active-tab="activeTab"
              :active-document-sub-tab="activeDocumentSubTab"
              v-show="true"
              class="w-full"
            />
          </div>

          <!-- Chat Button (Always visible on mobile, hidden on desktop) -->
          <button
            @click="toggleChat"
            class="fixed bottom-4 right-4 p-3 bg-purple-600 text-white rounded-full shadow-lg z-50 sm:hidden"
            :class="{ 'bg-gray-800': isChatOpen }"
          >
            <i class="pi pi-comments text-xl"></i>
          </button>

          <chat-panel
            v-show="isChatOpen"
            :is-open="isChatOpen"
            :is-mobile="isMobile"
            :width="chatWidth"
            @close="toggleChat"
            @update:width="updateChatWidth"
            class="z-50"
            :class="{ 'fixed inset-0 bg-gray-900 bg-opacity-95': isMobile, 'absolute right-0 top-0': !isMobile }"
            :style="{ 'width': isMobile ? '100%' : \`\${chatWidth}px\`, 'height': 'calc(100vh - 200px)' }"
          />
        </div>
      </div>
    </div>
  `,
  setup() {
    const { sessionInfo, connect, loadSession, disconnect, isConnected, connectionError, activeUsers, emit, on, off } = useRealTime();
    const sessionReady = Vue.ref(false);
    const activeTab = Vue.ref('Goals');
    const activeDocumentSubTab = Vue.ref('Uploads');
    const tabs = ['Goals', 'Agents', 'Documents', 'Transcriptions', 'Q&A', 'Artifacts'];
    const documentSubTabs = ['Uploads', 'Viewer', 'Clips'];
    const isRoomLocked = Vue.ref(false);
    const isChatOpen = Vue.ref(false);
    const chatWidth = Vue.ref(300);
    const { userUuid, displayName, channelName } = useRealTime();

    const isMobile = Vue.ref(window.matchMedia('(max-width: 640px)').matches);
    const updateIsMobile = () => {
      isMobile.value = window.matchMedia('(max-width: 640px)').matches;
    };
    window.addEventListener('resize', updateIsMobile);

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
      isRoomLocked.value = false;
      isChatOpen.value = false;
      chatWidth.value = 300;
    }

    function toggleRoomLock() {
      isRoomLocked.value = !isRoomLocked.value;
      emit('room-lock-toggle', { channelName: channelName.value, locked: isRoomLocked.value });
    }

    function uploadToCloud() {
      console.log('Uploading channel data to cloud:', { channelName: channelName.value, participants: activeUsers.value });
    }

    function downloadFromCloud() {
      console.log('Downloading channel data from cloud for:', channelName.value);
    }

    function updateActiveTab(tab) {
      activeTab.value = tab;
      if (tab !== 'Documents') {
        activeDocumentSubTab.value = 'Uploads';
      }
      emit('update-tab', { tab: tab, subTab: tab === 'Documents' ? activeDocumentSubTab.value : null });
    }

    function toggleChat() {
      isChatOpen.value = !isChatOpen.value;
    }

    function updateChatWidth(newWidth) {
      chatWidth.value = Math.max(200, newWidth);
    }

    function handleTabUpdate(data) {
      if (data.tab) {
        activeTab.value = data.tab;
        if (data.subTab && data.tab === 'Documents') {
          activeDocumentSubTab.value = data.subTab;
        }
      }
    }

    on('room-lock-toggle', (data) => {
      if (data.channelName === channelName.value) {
        isRoomLocked.value = data.locked;
      }
    });

    Vue.onUnmounted(() => {
      off('update-tab', handleTabUpdate);
      off('room-lock-toggle');
      window.removeEventListener('resize', updateIsMobile);
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

    return {
      sessionReady,
      activeTab,
      activeDocumentSubTab,
      tabs,
      documentSubTabs,
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
      isChatOpen,
      isMobile,
      toggleChat,
      chatWidth,
      updateChatWidth,
      updateActiveTab,
    };
  },
};