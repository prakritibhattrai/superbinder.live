// components/SessionSetup.js
import { useRealTime } from '../composables/useRealTime.js';

export default {
  name: 'SessionSetup',
  template: `
    <div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-2xl font-bold text-white mb-4">Join SuperBinder</h2>
        <div v-if="errorMessage" class="mb-4 p-2 bg-red-600 text-white rounded-lg">{{ errorMessage }}</div>
        <form @submit.prevent="submitSetup">
          <div class="mb-4">
            <label class="block text-gray-300 mb-2">Display Name</label>
            <input
              v-model="displayName"
              type="text"
              class="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              placeholder="Your name"
              required
            />
          </div>
          <div class="mb-4">
            <label class="block text-gray-300 mb-2">Channel Name</label>
            <input
              v-model="channelName"
              type="text"
              class="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
              placeholder="Channel to join or create (alphanumeric and underscore only)"
              required
            />
          </div>
          <button
            type="submit"
            class="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Join Channel
          </button>
        </form>
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const displayName = Vue.ref('');
    const channelName = Vue.ref('');
    const errorMessage = Vue.ref('');

    const { connect, on } = useRealTime();

    function submitSetup() {
      if (displayName.value && channelName.value) {
        if (!isValidChannelName(channelName.value)) {
          errorMessage.value = 'Invalid channel name. Use alphanumeric characters and underscores only.';
          return;
        }
        connect(channelName.value, displayName.value);
        emit('setup-complete', {
          channel: channelName.value,
          name: displayName.value,
        });
      }
    }

    on('error', (data) => {
      if (data.message === 'Channel is Locked') {
        errorMessage.value = 'This channel is locked and cannot be joined.';
      } else if (data.message.includes('Invalid channel name')) {
        errorMessage.value = 'Invalid channel name. Use alphanumeric characters and underscores only.';
      } else {
        errorMessage.value = data.message || 'An error occurred.';
      }
    });

    function isValidChannelName(channelName) {
      if (!channelName || typeof channelName !== 'string') return false;
      return /^[a-zA-Z0-9_]+$/.test(channelName);
    }

    return {
      displayName,
      channelName,
      errorMessage,
      submitSetup,
    };
  },
};