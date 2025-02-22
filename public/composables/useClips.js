import { useRealTime } from './useRealTime.js';

const clips = Vue.ref([]);
const { emit, on, off } = useRealTime();

export function useClips() {
  function handleAddClip(clip) {
    if (!clips.value.some(c => c.id === clip.id)) clips.value.push(clip);
  }
  function handleRemoveClip(id) {
    clips.value = clips.value.filter(c => c.id !== id);
  }
  function handleVoteClip({ clipId, direction }) {
    const clip = clips.value.find(c => c.id === clipId);
    if (clip) clip.votes += direction === 'up' ? 1 : -1;
  }
  function handleSnapshot(history) {
    clips.value = history.clips || [];
  }

  on('add-clip', handleAddClip);
  on('remove-clip', handleRemoveClip);
  on('vote-clip', handleVoteClip);
  on('history-snapshot', handleSnapshot);

  Vue.onUnmounted(() => {
    off('add-clip', handleAddClip);
    off('remove-clip', handleRemoveClip);
    off('vote-clip', handleVoteClip);
    off('history-snapshot', handleSnapshot);
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