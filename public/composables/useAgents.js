// composables/useAgents.js
import { useRealTime } from './useRealTime.js';

const agents = Vue.ref([]);
const { userUuid, displayName, emit, on, off } = useRealTime();

// Store event handlers for cleanup
const eventHandlers = new WeakMap();

export function useAgents() {
  function handleAddAgent({ agent }) {
    if (!agents.value.some(a => a.id === agent.id)) {
      agents.value = [...agents.value, agent];
    }
  }

  function handleUpdateAgent({ agent }) {
    const index = agents.value.findIndex(a => a.id === agent.id);
    if (index !== -1) {
      agents.value = agents.value.map((a, i) => (i === index ? { ...agent } : a));
    } else {
      console.warn(`Agent with ID ${agent.id} not found for update, adding as new`);
      agents.value = [...agents.value, agent];
    }
  }

  function handleRemoveAgent({ id }) {
    agents.value = agents.value.filter(a => a.id !== id);
  }

  // Register event listeners
  const addAgentHandler = on('add-agent', handleAddAgent);
  const updateAgentHandler = on('update-agent', handleUpdateAgent);
  const removeAgentHandler = on('remove-agent', handleRemoveAgent);

  eventHandlers.set(useAgents, {
    addAgent: addAgentHandler,
    updateAgent: updateAgentHandler,
    removeAgent: removeAgentHandler,
  });

  function addAgent(name, description, imageUrl, systemPrompts = [], userPrompts = []) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('Agent name must contain only letters, numbers, or underscores, with no spaces.');
    }
    const id = uuidv4(); // Generate unique ID
    const agent = {
      id,
      name,
      createdBy: displayName.value,
      description,
      imageUrl,
      systemPrompts: systemPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || '',
      })),
      userPrompts: userPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || '',
      })),
    };
    // Add to local state immediately
    if (!agents.value.some(a => a.id === agent.id)) {
      agents.value = [...agents.value, agent];
    }
    // Emit to backend for persistence and sync with other clients
    emit('add-agent', { agent });
  }

  function updateAgent(id, name, description, imageUrl, systemPrompts, userPrompts) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('Agent name must contain only letters, numbers, or underscores, with no spaces.');
    }
    const agent = {
      id,
      name,
      createdBy: displayName.value,
      description,
      imageUrl,
      systemPrompts: systemPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || '',
      })),
      userPrompts: userPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || '',
      })),
    };
    // Update local state immediately
    const index = agents.value.findIndex(a => a.id === agent.id);
    if (index !== -1) {
      agents.value = agents.value.map((a, i) => (i === index ? { ...agent } : a));
    } else {
      console.warn(`Agent with ID ${agent.id} not found for update, adding as new`);
      agents.value = [...agents.value, agent];
    }
    // Emit to backend
    emit('update-agent', { agent });
  }

  function removeAgent(id) {
    // Update local state immediately
    agents.value = agents.value.filter(a => a.id !== id);
    // Emit to backend
    emit('remove-agent', { id });
  }

  function cleanup() {
    const handlers = eventHandlers.get(useAgents);
    if (handlers) {
      off('add-agent', handlers.addAgent);
      off('update-agent', handlers.updateAgent);
      off('remove-agent', handlers.removeAgent);
      eventHandlers.delete(useAgents);
    }
  }

  return { agents, addAgent, updateAgent, removeAgent, cleanup };
}