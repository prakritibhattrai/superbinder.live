// components/ViewerArtifacts.js
import { useRealTime } from '../composables/useRealTime.js';

export default {
  name: 'ViewerArtifacts',
  template: `
    <div class="h-full flex flex-col overflow-hidden p-4">
      <h3 class="text-lg font-semibold text-purple-400 mb-4">Artifacts</h3>
      <div contenteditable="true" class="flex-1 p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500" @input="updateArtifact">
        Start collaborating on a document here...
      </div>
      <div class="mt-2 text-gray-400">Collaborate with others and AI agents in real-time.</div>
    </div>
  `,
  setup() {
    const { emit } = useRealTime();
    const artifactContent = Vue.ref('');

    function updateArtifact(event) {
      artifactContent.value = event.target.textContent;
      emit('update-artifact', { content: artifactContent.value });
    }

    return { updateArtifact };
  },
};