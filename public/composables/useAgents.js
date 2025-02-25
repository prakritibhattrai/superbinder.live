// composables/useAgents.js
import { useRealTime } from './useRealTime.js';

const agents = Vue.ref([]);
const { userUuid, displayName, emit, on, off } = useRealTime();

// Store event handlers for cleanup
const eventHandlers = new WeakMap();

export function useAgents() {
  function handleAddAgent(agent) {
    if (!agents.value.some(a => a.uuid === agent.uuid)) {
      agents.value.push(agent);
    }
  }

  function handleUpdateAgent(updatedAgent) {
    const index = agents.value.findIndex(a => a.uuid === updatedAgent.uuid);
    if (index !== -1) {
      // Use spread operator for reactivity in Vue 3
      agents.value = agents.value.map((agent, i) =>
        i === index ? { ...agent, ...updatedAgent } : agent
      );
    } else {
      console.warn(`Agent with UUID ${updatedAgent.uuid} not found for update`);
    }
  }

  function handleRemoveAgent({ uuid }) {
    agents.value = agents.value.filter(a => a.uuid !== uuid);
  }

  // Register event listeners and store handlers for cleanup
  const addAgentHandler = on('add-agent', handleAddAgent);
  const updateAgentHandler = on('update-agent', handleUpdateAgent);
  const removeAgentHandler = on('remove-agent', handleRemoveAgent);

  // Store handlers in a WeakMap for cleanup
  eventHandlers.set(useAgents, {
    addAgent: addAgentHandler,
    updateAgent: updateAgentHandler,
    removeAgent: removeAgentHandler,
  });

  function addAgent(name, description, imageUrl, systemPrompts = [], userPrompts = []) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('Agent name must contain only letters, numbers, or underscores, with no spaces.');
    }
    const uuid = uuidv4(); // Generate a unique UUID for the agent
    const agent = {
      uuid, // Use UUID as the unique identifier
      name,
      createdBy: displayName.value,
      description,
      imageUrl,
      systemPrompts: systemPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || prompt.text || '',
      })),
      userPrompts: userPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || prompt.text || '',
      })),
    };
    agents.value.push(agent);
    emit('add-agent', { agent });
  }

  function updateAgent(uuid, name, description, imageUrl, systemPrompts, userPrompts) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('Agent name must contain only letters, numbers, or underscores, with no spaces.');
    }
    const agent = {
      uuid, // Retain the original UUID for updates
      name,
      createdBy: displayName.value,
      description,
      imageUrl,
      systemPrompts: systemPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || prompt.text || '',
      })),
      userPrompts: userPrompts.map(prompt => ({
        id: prompt.id || uuidv4(),
        type: prompt.type || 'text',
        content: prompt.content || prompt.text || '',
      })),
    };
    const index = agents.value.findIndex(a => a.uuid === uuid);
    if (index !== -1) {
      // Use spread operator for reactivity in Vue 3
      agents.value = agents.value.map((a, i) =>
        i === index ? agent : a
      );
    } else {
      console.warn(`Agent with UUID ${uuid} not found for update`);
      agents.value.push(agent); // Add as new if not found (should not happen in normal use)
    }
    emit('update-agent', { agent });
  }

  function removeAgent(uuid) {
    agents.value = agents.value.filter(a => a.uuid !== uuid);
    emit('remove-agent', { uuid });
  }

  // Cleanup function for components to call
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