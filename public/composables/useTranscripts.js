// composables/useTranscripts.js
import { useRealTime } from './useRealTime.js';

const transcripts = Vue.ref([]);
const { emit, on, off } = useRealTime();

// Store event handlers for cleanup
const eventHandlers = new WeakMap();

export function useTranscripts() {
  function handleAddTranscript(transcript) {
    if (!transcripts.value.some(t => t.id === transcript.id)) {
      transcripts.value.push(transcript);
    }
  }

  function handleUpdateTranscript(updatedTranscript) {
    const index = transcripts.value.findIndex(t => t.id === updatedTranscript.id);
    if (index !== -1) {
      transcripts.value = transcripts.value.map((t, i) => i === index ? updatedTranscript : t);
    }
  }

  function handleRemoveTranscript({ id }) {
    transcripts.value = transcripts.value.filter(t => t.id !== id);
  }

  // Register event listeners and store handlers for cleanup
  const addTranscriptHandler = on('add-transcript', handleAddTranscript);
  const updateTranscriptHandler = on('update-transcript', handleUpdateTranscript);
  const removeTranscriptHandler = on('remove-transcript', handleRemoveTranscript);

  // Store handlers in a WeakMap for cleanup
  eventHandlers.set(useTranscripts, {
    addTranscript: addTranscriptHandler,
    updateTranscript: updateTranscriptHandler,
    removeTranscript: removeTranscriptHandler,
  });

  function addTranscript(id, data) {
    const transcript = { id, data };
    transcripts.value.push(transcript);
    emit('add-transcript', { transcript });
  }

  function updateTranscript(id, data) {
    const transcript = { id, data };
    const index = transcripts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      transcripts.value = transcripts.value.map((t, i) => i === index ? transcript : t);
    }
    emit('update-transcript', { transcript });
  }

  function removeTranscript(id) {
    transcripts.value = transcripts.value.filter(t => t.id !== id);
    emit('remove-transcript', { id });
  }

  // Cleanup function for components to call
  function cleanup() {
    const handlers = eventHandlers.get(useTranscripts);
    if (handlers) {
      off('add-transcript', handlers.addTranscript);
      off('update-transcript', handlers.updateTranscript);
      off('remove-transcript', handlers.removeTranscript);
      eventHandlers.delete(useTranscripts);
    }
  }

  return { transcripts, addTranscript, updateTranscript, removeTranscript, cleanup };
}