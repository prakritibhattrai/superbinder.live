// composables/useClips.js
import { useRealTime } from './useRealTime.js';

const clips = Vue.ref([]);
const { emit, on, off } = useRealTime();

// Store event handlers for cleanup
const eventHandlers = new WeakMap();

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

  // Register event listeners and store handlers for cleanup
  const addClipHandler = on('add-clip', handleAddClip);
  const removeClipHandler = on('remove-clip', handleRemoveClip);
  const voteClipHandler = on('vote-clip', handleVoteClip);
  const snapshotHandler = on('history-snapshot', handleSnapshot);

  // Store handlers in a WeakMap for cleanup
  eventHandlers.set(useClips, {
    addClip: addClipHandler,
    removeClip: removeClipHandler,
    voteClip: voteClipHandler,
    snapshot: snapshotHandler,
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

  // Cleanup function for components to call
  function cleanup() {
    const handlers = eventHandlers.get(useClips);
    if (handlers) {
      off('add-clip', handlers.addClip);
      off('remove-clip', handlers.removeClip);
      off('vote-clip', handlers.voteClip);
      off('history-snapshot', handlers.snapshot);
      eventHandlers.delete(useClips);
    }
  }

  return { clips, addClip, removeClip, voteClip, cleanup };
}