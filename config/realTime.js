const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');

const channels = new Map(); // Store channel state as { users: {}, sockets: {}, state: {}, locked: boolean }

// Configuration for each entity type and their corresponding event names
const entityConfigs = {
  goals: { idKey: 'id', requiredFields: ['id', 'text'], orderField: 'order', events: { add: 'add-goal', update: 'update-goal', remove: 'remove-goal', reorder: 'reorder-goals' } },
  agents: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-agent', update: 'update-agent', remove: 'remove-agent', reorder: null } },
  messages: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'chat-message', update: null, remove: null, reorder: null } },
  clips: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-clip', update: null, remove: 'remove-clip', reorder: null } },
  documents: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-document', update: 'rename-document', remove: 'remove-document', reorder: null } },
  questions: { idKey: 'id', requiredFields: ['id'], orderField: 'order', events: { add: 'add-question', update: 'update-question', remove: 'remove-question', reorder: 'reorder-questions' } },
  artifacts: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-artifact', update: null, remove: 'remove-artifact', reorder: null } },
  transcripts: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-transcript', update: null, remove: 'remove-transcript', reorder: null } },
};

function validateJoinData(data) {
  return data && data.userUuid && data.displayName && data.channelName && isValidChannelName(data.channelName);
}

function validateLeaveData(data) {
  return data && data.userUuid && data.channelName && isValidChannelName(data.channelName);
}

function validateMessage(data) {
  const isHeartbeat = data && data.type && (data.type === 'ping' || data.type === 'pong');
  if (isHeartbeat) return true;
  return data && data.userUuid && data.channelName && data.type && isValidChannelName(data.channelName);
}

function isValidChannelName(channelName) {
  if (!channelName || typeof channelName !== 'string') return false;
  return /^[a-zA-Z0-9_]+$/.test(channelName);
}

async function loadStateFromServer(channelName) {
  try {
    const channelDir = path.join(__dirname, '../channels');
    const filePath = path.join(channelDir, `${channelName}.json`);
    const data = await fs.readFile(filePath, 'utf8').then(JSON.parse).catch(() => ({
      agents: [],
      messages: [],
      clips: [],
      documents: [],
      goals: [],
      questions: [],
      artifacts: [],
      transcripts: [],
    }));
    return data;
  } catch (error) {
    console.error('Error loading state from server:', error);
    return {
      agents: [],
      messages: [],
      clips: [],
      documents: [],
      goals: [],
      questions: [],
      artifacts: [],
      transcripts: [],
    };
  }
}

async function saveStateToServer(channelName, state) {
  try {
    const channelDir = path.join(__dirname, '../channels');
    await fs.mkdir(channelDir, { recursive: true });
    const filePath = path.join(channelDir, `${channelName}.json`);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2));
    console.log(`Channel ${channelName} state saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving state to server:', error);
  }
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function broadcastToChannel(channelName, type, data, excludeUuid = null) {
  if (channels.has(channelName)) {
    const channel = channels.get(channelName);
    const serverTimestamp = Date.now();
    const payload = { type, timestamp: serverTimestamp, serverTimestamp, ...data };
    for (const userUuid in channel.sockets) {
      if (userUuid !== excludeUuid) {
        channel.sockets[userUuid].emit('message', payload);
      }
    }
  }
}

function cleanupUser(channelName, userUuid, socket) {
  if (channels.has(channelName)) {
    const channel = channels.get(channelName);
    delete channel.users[userUuid];
    delete channel.sockets[userUuid];
    socket.leave(channelName);

    if (Object.keys(channel.users).length === 0) {
      channels.delete(channelName);
      console.log(`Channel ${channelName} deleted (empty)`);
    } else {
      broadcastToChannel(channelName, 'user-list', { users: channel.users });
    }
    console.log(`${userUuid} left channel ${channelName}`);
  }
}

// Generic validation function for CRUD operations
function validateEntity(payload, entityType, operation) {
  const config = entityConfigs[entityType];
  if (!config) {
    return { valid: false, message: `Unknown entity type: ${entityType}` };
  }

  const eventConfig = config.events[operation];
  if (!eventConfig) {
    return { valid: false, message: `Unsupported operation ${operation} for ${entityType}` };
  }

  switch (operation) {
    case 'add':
      const addEntity = { id: payload.id, text: payload.text };
      if (!addEntity || typeof addEntity !== 'object') {
        return { valid: false, message: `Invalid ${entityType} data: missing entity object` };
      }
      for (const field of config.requiredFields) {
        if (!addEntity[field]) {
          return { valid: false, message: `Invalid ${entityType} data for ${operation}: missing ${field}` };
        }
      }
      return { valid: true, message: '' };
    case 'update':
      const updateEntity = { id: payload.id, text: payload.text };
      if (!updateEntity || typeof updateEntity !== 'object') {
        return { valid: false, message: `Invalid ${entityType} data for ${operation}: missing entity object` };
      }
      for (const field of config.requiredFields) {
        if (!updateEntity[field]) {
          return { valid: false, message: `Invalid ${entityType} data for ${operation}: missing ${field}` };
        }
      }
      return { valid: true, message: '' };
    case 'remove':
      if (!payload.id) {
        return { valid: false, message: `Invalid ${entityType} data for ${operation}: missing id` };
      }
      return { valid: true, message: '' };
    case 'reorder':
      if (!Array.isArray(payload.order) || payload.order.length === 0) {
        return { valid: false, message: `Invalid ${entityType} order format: expected non-empty array of IDs` };
      }
      return { valid: true, message: '' };
    default:
      return { valid: false, message: `Unknown operation: ${operation}` };
  }
}

// Generic state update functions for CRUD operations
function updateCreateState(state, payload, entityType) {
  const entity = { id: payload.id, text: payload.text };
  const config = entityConfigs[entityType];
  const order = config.orderField ? state.length : undefined;
  state.push({ ...entity, [config.orderField || '']: order });
}

function updateUpdateState(state, payload, entityType) {
  const entity = { id: payload.id, text: payload.text };
  const config = entityConfigs[entityType];
  const index = state.findIndex(item => item[config.idKey] === entity[config.idKey]);
  if (index !== -1) {
    state[index] = { ...state[index], ...entity };
  }
}

function updateDeleteState(state, payload, entityType) {
  const config = entityConfigs[entityType];
  const id = payload.id;
  const newState = state.filter(item => item[config.idKey] !== id);
  if (config.orderField) {
    newState.forEach((item, index) => {
      item[config.orderField] = index;
    });
  }
  return newState;
}

function updateReorderState(state, payload, entityType) {
  const config = entityConfigs[entityType];
  const order = payload.order;
  const newState = order.map(id => {
    const item = state.find(item => item[config.idKey] === id);
    if (!item) return null;
    return item;
  }).filter(Boolean).map((item, index) => ({ ...item, [config.orderField || '']: index }));
  return newState;
}

// Universal CRUD handler
async function handleCrudOperation(channelName, userUuid, type, payload, socket) {
  const [operation, entityType] = type.split('-');
  if (!operation || !entityType) {
    socket.emit('message', { type: 'error', message: `Invalid event type: ${type}`, timestamp: Date.now() });
    return;
  }

  const config = entityConfigs[entityType];
  if (!config || !config.events[operation]) {
    socket.emit('message', { type: 'error', message: `Unsupported operation ${operation} for ${entityType}`, timestamp: Date.now() });
    return;
  }

  const validation = validateEntity(payload, entityType, operation);
  if (!validation.valid) {
    console.warn(validation.message, payload);
    socket.emit('message', { type: 'error', message: validation.message, timestamp: Date.now() });
    return;
  }

  if (!channels.has(channelName)) {
    socket.emit('message', { type: 'error', message: 'Invalid channel', timestamp: Date.now() });
    return;
  }

  const channel = channels.get(channelName);
  if (!Array.isArray(channel.state[entityType])) {
    console.warn(`State for ${entityType} in channel ${channelName} is not initialized. Initializing as empty array.`);
    channel.state[entityType] = [];
  }
  let state = channel.state[entityType];

  let updateFunc;
  switch (operation) {
    case 'add':
      updateFunc = updateCreateState;
      break;
    case 'update':
      updateFunc = updateUpdateState;
      break;
    case 'remove':
      updateFunc = updateDeleteState;
      break;
    case 'reorder':
      updateFunc = updateReorderState;
      break;
    default:
      socket.emit('message', { type: 'error', message: `Unknown operation: ${operation}`, timestamp: Date.now() });
      return;
  }

  const newState = updateFunc(state, payload, entityType);
  if (newState !== undefined) {
    channel.state[entityType] = newState;
    state = newState;
  }

  const broadcastData = {
    userUuid,
    ...(operation === 'add' ? { id: payload.id, text: payload.text } : {}),
    ...(operation === 'update' ? { id: payload.id, text: payload.text } : {}),
    ...(operation === 'remove' ? { id: payload.id } : {}),
    ...(operation === 'reorder' ? { order: payload.order } : {}),
  };
  broadcastToChannel(channelName, config.events[operation], broadcastData, userUuid);
  await saveStateToServer(channelName, channel.state);
}

function createRealTimeServers(server, corsOptions) {
  const io = new Server(server, {
    cors: corsOptions || { origin: '*' },
    pingInterval: 5000,
    pingTimeout: 10000,
    maxHttpBufferSize: 1e8,
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-channel', async (data) => {
      if (!validateJoinData(data)) {
        socket.emit('message', { type: 'error', message: 'Invalid channel name or data', timestamp: Date.now() });
        return;
      }

      const { userUuid, displayName, channelName } = data;
      socket.join(channelName);
      socket.userUuid = userUuid;

      if (!channels.has(channelName)) {
        const initialState = await loadStateFromServer(channelName);
        channels.set(channelName, {
          users: {},
          sockets: {},
          state: initialState,
          locked: false,
        });
      }

      const channel = channels.get(channelName);
      if (channel.locked) {
        socket.emit('message', { type: 'error', message: 'Channel is Locked', timestamp: Date.now() });
        return;
      }

      if (channel.users[userUuid]) {
        console.log(`${displayName} (${userUuid}) rejoined channel ${channelName}`);
      } else {
        console.log(`${displayName} (${userUuid}) joined channel ${channelName}`);
      }

      const color = getRandomColor();
      channel.users[userUuid] = { displayName, color, joinedAt: Date.now() };
      channel.sockets[userUuid] = socket;

      socket.emit('message', {
        type: 'init-state',
        userUuid,
        channelName,
        timestamp: Date.now(),
        state: channel.state,
      });

      broadcastToChannel(channelName, 'user-list', { users: channel.users });
      broadcastToChannel(channelName, 'user-joined', { userUuid, displayName, color, timestamp: Date.now() });
    });

    socket.on('leave-channel', (data) => {
      if (!validateLeaveData(data)) return;
      cleanupUser(data.channelName, data.userUuid, socket);
    });

    socket.on('disconnect', () => {
      for (const [channelName, channel] of channels) {
        if (channel.sockets[socket.userUuid]) {
          cleanupUser(channelName, socket.userUuid, socket);
          break;
        }
      }
      console.log(`Client disconnected: ${socket.id}`);
    });

    socket.on('message', async (data) => {
      await handleMessage(data, socket);
    });
  });
}

async function handleMessage(data, socket) {
  if (!validateMessage(data)) {
    socket.emit('message', { type: 'error', message: 'Invalid channel name or message format', timestamp: Date.now() });
    return;
  }

  const { userUuid, channelName, type, ...payload } = data;
  if (!channels.has(channelName) || !channels.get(channelName).sockets[userUuid]) {
    if (type !== 'ping' && type !== 'pong') {
      socket.emit('message', { type: 'error', message: 'Invalid channel or user', timestamp: Date.now() });
      return;
    }
  }

  const channel = channels.get(channelName);

  switch (type) {
    case 'ping':
      socket.emit('message', { type: 'pong', timestamp: Date.now() });
      break;
    case 'pong':
      break;
    case 'add-goal':
      await handleCrudOperation(channelName, userUuid, 'add-goals', { id: payload.id, text: payload.text }, socket);
      break;
    case 'update-goal':
      await handleCrudOperation(channelName, userUuid, 'update-goals', { id: payload.id, text: payload.text }, socket);
      break;
    case 'remove-goal':
      await handleCrudOperation(channelName, userUuid, 'remove-goals', { id: payload.id }, socket);
      break;
    case 'reorder-goals':
      await handleCrudOperation(channelName, userUuid, 'reorder-goals', { order: payload.order }, socket);
      break;
    case 'add-agent':
      await handleCrudOperation(channelName, userUuid, 'add-agents', { agent: payload.agent }, socket);
      break;
    case 'update-agent':
      await handleCrudOperation(channelName, userUuid, 'update-agents', { agent: payload.agent }, socket);
      break;
    case 'remove-agent':
      await handleCrudOperation(channelName, userUuid, 'remove-agents', { agentId: payload.agentId }, socket);
      break;
    case 'chat-message':
      await handleCrudOperation(channelName, userUuid, 'add-messages', { message: payload.message }, socket);
      break;
    case 'add-clip':
      await handleCrudOperation(channelName, userUuid, 'add-clips', { clip: payload.clip }, socket);
      break;
    case 'remove-clip':
      await handleCrudOperation(channelName, userUuid, 'remove-clips', { clipId: payload.clipId }, socket);
      break;
    case 'add-document':
      await handleCrudOperation(channelName, userUuid, 'add-documents', { document: payload.document }, socket);
      break;
    case 'remove-document':
      await handleCrudOperation(channelName, userUuid, 'remove-documents', { documentId: payload.documentId }, socket);
      break;
    case 'rename-document':
      await handleCrudOperation(channelName, userUuid, 'update-documents', { id: payload.documentId, name: payload.name }, socket);
      break;
    case 'add-question':
      await handleCrudOperation(channelName, userUuid, 'add-questions', { question: payload.question }, socket);
      break;
    case 'update-question':
      await handleCrudOperation(channelName, userUuid, 'update-questions', { question: payload.question }, socket);
      break;
    case 'remove-question':
      await handleCrudOperation(channelName, userUuid, 'remove-questions', { questionId: payload.questionId }, socket);
      break;
    case 'reorder-questions':
      await handleCrudOperation(channelName, userUuid, 'reorder-questions', { order: payload.questions }, socket);
      break;
    case 'add-artifact':
      await handleCrudOperation(channelName, userUuid, 'add-artifacts', { artifact: payload.artifact }, socket);
      break;
    case 'remove-artifact':
      await handleCrudOperation(channelName, userUuid, 'remove-artifacts', { artifactId: payload.artifactId }, socket);
      break;
    case 'add-transcript':
      await handleCrudOperation(channelName, userUuid, 'add-transcripts', { transcript: payload.transcript }, socket);
      break;
    case 'remove-transcript':
      await handleCrudOperation(channelName, userUuid, 'remove-transcripts', { transcriptId: payload.transcriptId }, socket);
      break;
    case 'room-lock-toggle':
      channel.locked = payload.locked;
      broadcastToChannel(channelName, type, { channelName, locked: payload.locked });
      await saveStateToServer(channelName, channel.state);
      break;
    case 'upload-to-cloud':
      console.log("Upload to Cloud");
      await saveStateToServer(channelName, channel.state);
      break;
    case 'error':
    case 'unknown':
      break;
    default:
      console.warn(`Unknown message type: ${type}`);
      socket.emit('message', { type: 'error', message: `Unknown message type: ${type}`, timestamp: Date.now() });
  }
}

module.exports = { createRealTimeServers };