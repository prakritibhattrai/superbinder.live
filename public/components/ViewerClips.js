// components/ViewerClips.vue
import { useClips } from '../composables/useClips.js';

export default {
  name: 'ViewerClips',
  template: `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="clip in clips" :key="clip.id" class="p-4 bg-gray-700 rounded-lg">
        <p>{{ clip.content.substring(0, 50) }}...</p>
        <div class="flex gap-2 mt-2">
          <button @click="voteClip(clip.id, 'up')" class="text-green-400">↑ {{ clip.votes }}</button>
          <button @click="voteClip(clip.id, 'down')" class="text-red-400">↓</button>
        </div>
      </div>
      <div v-if="clips.length === 0" class="text-gray-400">No clips yet.</div>
    </div>
  `,
  setup() {
    const { clips, voteClip } = useClips();
    return { clips, voteClip };
  },
};