// composables/useClips.js
import { useRealTime } from './useRealTime.js';

const clips = Vue.ref([]);
const { emit, on } = useRealTime();

export function useClips() {
  on('add-clip', (clip) => {
    if (!clips.value.some(c => c.id === clip.id)) {
      clips.value.push(clip);
    }
  });
  on('remove-clip', (id) => {
    clips.value = clips.value.filter(c => c.id !== id);
  });
  on('vote-clip', ({ clipId, direction }) => {
    const clip = clips.value.find(c => c.id === clipId);
    if (clip) clip.votes += direction === 'up' ? 1 : -1;
  });

  function addClip(content, documentId) {
    const clip = { id: uuidv4(), documentId, content, votes: 0, timestamp: Date.now() };
    clips.value.push(clip);
    emit('add-clip', { clip });
  }

  function removeClip(id) {
    clips.value = clips.value.filter(c => c.id !== id);
    emit('remove-clip', { clipId: id });
  }

  function voteClip(id, direction) {
    const clip = clips.value.find(c => c.id === id);
    if (clip) {
      clip.votes += direction === 'up' ? 1 : -1;
      emit('vote-clip', { clipId: id, direction });
    }
  }

  return { clips, addClip, removeClip, voteClip };
}