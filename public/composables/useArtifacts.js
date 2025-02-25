// composables/useArtifacts.js
import { useRealTime } from './useRealTime.js';

const artifacts = Vue.ref([]);
const { emit, on, off } = useRealTime();

// Store event handlers for cleanup
const eventHandlers = new WeakMap();

export function useArtifacts() {
  function handleAddArtifact(artifact) {
    if (!artifacts.value.some(a => a.id === artifact.id)) {
      artifacts.value.push(artifact);
    }
  }

  function handleUpdateArtifact(updatedArtifact) {
    const index = artifacts.value.findIndex(a => a.id === updatedArtifact.id);
    if (index !== -1) {
      artifacts.value = artifacts.value.map((a, i) => i === index ? updatedArtifact : a);
    }
  }

  function handleRemoveArtifact({ id }) {
    artifacts.value = artifacts.value.filter(a => a.id !== id);
  }

  // Register event listeners and store handlers for cleanup
  const addArtifactHandler = on('add-artifact', handleAddArtifact);
  const updateArtifactHandler = on('update-artifact', handleUpdateArtifact);
  const removeArtifactHandler = on('remove-artifact', handleRemoveArtifact);

  // Store handlers in a WeakMap for cleanup
  eventHandlers.set(useArtifacts, {
    addArtifact: addArtifactHandler,
    updateArtifact: updateArtifactHandler,
    removeArtifact: removeArtifactHandler,
  });

  function addArtifact(id, data) {
    const artifact = { id, data };
    artifacts.value.push(artifact);
    emit('add-artifact', { artifact });
  }

  function updateArtifact(id, data) {
    const artifact = { id, data };
    const index = artifacts.value.findIndex(a => a.id === id);
    if (index !== -1) {
      artifacts.value = artifacts.value.map((a, i) => i === index ? artifact : a);
    }
    emit('update-artifact', { artifact });
  }

  function removeArtifact(id) {
    artifacts.value = artifacts.value.filter(a => a.id !== id);
    emit('remove-artifact', { id });
  }

  // Cleanup function for components to call
  function cleanup() {
    const handlers = eventHandlers.get(useArtifacts);
    if (handlers) {
      off('add-artifact', handlers.addArtifact);
      off('update-artifact', handlers.updateArtifact);
      off('remove-artifact', handlers.removeArtifact);
      eventHandlers.delete(useArtifacts);
    }
  }

  return { artifacts, addArtifact, updateArtifact, removeArtifact, cleanup };
}