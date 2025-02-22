// components/SessionSetup.js
export default {
    name: 'SessionSetup',
    props: {},
    template: `
      <div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
          <h2 class="text-2xl font-bold text-white mb-4">Join SuperBinder</h2>
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
                placeholder="Channel to join or create"
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
    setup(props, { emit }) { // Destructure emit from context
      const displayName = Vue.ref('');
      const channelName = Vue.ref('');
  
      function submitSetup() {
        if (displayName.value && channelName.value) {
          emit('setup-complete', {
            channel: channelName.value,
            name: displayName.value,
          });
        }
      }
  
      return {
        displayName,
        channelName,
        submitSetup,
      };
    },
  };