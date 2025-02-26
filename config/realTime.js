const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');

const channels = new Map(); // Store channel state as { users: {}, sockets: {}, state: { goals: [], chat: [], ... }, locked: boolean }

// Configuration for each entity type and their corresponding event names
const entityConfigs = {
  goals: { idKey: 'id', requiredFields: ['id', 'text'], orderField: 'order', events: { add: 'add-goal', update: 'update-goal', remove: 'remove-goal', reorder: 'reorder-goals' } },
  agents: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-agent', update: 'update-agent', remove: 'remove-agent', reorder: null } },
  chat: { idKey: 'id', requiredFields: ['id', 'text'], orderField: null, events: { add: 'add-chat', update: 'update-chat', remove: 'delete-chat', draft: 'draft-chat' } }, // Updated for new events
  clips: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-clip', update: null, remove: 'remove-clip', reorder: null } },
  documents: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-document', update: 'rename-document', remove: 'remove-document', reorder: null } },
  questions: { idKey: 'id', requiredFields: ['id'], orderField: 'order', events: { add: 'add-question', update: 'update-question', remove: 'remove-question', reorder: 'reorder-questions' } },
  artifacts: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-artifact', update: null, remove: 'remove-artifact', reorder: null } },
  transcripts: { idKey: 'id', requiredFields: ['id'], orderField: null, events: { add: 'add-transcript', update: null, remove: 'remove-transcript', reorder: null } },
};

// Function to get file path for a specific entity type
function getEntityFilePath(channelName, entityType) {
  const channelDir = path.join(__dirname, '../channels');
  return path.join(channelDir, `${channelName}_${entityType}.json`);
}

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

async function loadStateFromServer(channelName, entityType) {
  try {
    const filePath = getEntityFilePath(channelName, entityType);
    const data = await fs.readFile(filePath, 'utf8').then(JSON.parse).catch(() => []);
    return data;
  } catch (error) {
    console.error(`Error loading ${entityType} state from server for channel ${channelName}:`, error);
    return []; // Return empty array for any entity type if there's an error
  }
}

async function saveStateToServer(channelName, entityType, state) {
  try {
    const filePath = getEntityFilePath(channelName, entityType);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(state, null, 2));
    console.log(`Channel ${channelName} ${entityType} state saved to ${filePath}`);
  } catch (error) {
    console.error(`Error saving ${entityType} state to server for channel ${channelName}:`, error);
  }
}

function broadcastToChannel(channelName, type, data, excludeUuid = null) {
  if (channels.has(channelName)) {
    const channel = channels.get(channelName);
    const serverTimestamp = Date.now();
    const payload = { type, timestamp: serverTimestamp, serverTimestamp, ...data }; // Use serverTimestamp for consistency
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
      const addEntity = { id: payload.id, text: payload.text, color: payload.color };
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
    case 'draft':
      const draftEntity = { id: payload.id, text: payload.text };
      if (!draftEntity || typeof draftEntity.text !== 'string') {
        return { valid: false, message: `Invalid ${entityType} draft data: missing or invalid text` };
      }
      return { valid: true, message: '' };
    default:
      return { valid: false, message: `Unknown operation: ${operation}` };
  }
}

// Generic state update functions for CRUD operations
function updateCreateState(state, payload, entityType) {
  const entity = { 
    id: payload.id, 
    text: payload.text, 
    color: payload.color, 
    userUuid: payload.userUuid, 
    timestamp: payload.timestamp || Date.now() // Default to server timestamp if not provided
  };
  const config = entityConfigs[entityType];
  const order = config.orderField ? state.length : undefined;
  state.push({ ...entity, [config.orderField || '']: order });
}

function updateUpdateState(state, payload, entityType) {
  const entity = { 
    id: payload.id, 
    text: payload.text, 
    userUuid: payload.userUuid, 
    timestamp: payload.timestamp || Date.now() // Use server timestamp for updates
  };
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
  // Map the full event type to operation and entity type without splitting
  let operation, entityType;
  for (const [et, config] of Object.entries(entityConfigs)) {
    if (config.events.add === type) {
      operation = 'add';
      entityType = et;
      break;
    } else if (config.events.update === type) {
      operation = 'update';
      entityType = et;
      break;
    } else if (config.events.remove === type) {
      operation = 'remove';
      entityType = et;
      break;
    } else if (config.events.reorder === type) {
      operation = 'reorder';
      entityType = et;
      break;
    } else if (config.events.draft === type) {
      operation = 'draft';
      entityType = et;
      break;
    }
  }

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

  let updateFunc, shouldSave = true;
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
    case 'draft':
      updateFunc = null; // No state update for draft, just broadcast
      shouldSave = false;
      break;
    default:
      socket.emit('message', { type: 'error', message: `Unknown operation: ${operation}`, timestamp: Date.now() });
      return;
  }

  if (operation === 'draft') {
    // Broadcast draft-chat with server timestamp, but don't update state or save to JSON
    const serverTimestamp = Date.now();
    broadcastToChannel(channelName, 'draft-chat', { 
      id: payload.id, 
      userUuid, 
      text: payload.text, 
      timestamp: serverTimestamp 
    }, userUuid);
    return; // Exit early, no state update or save needed
  }

  const newState = updateFunc ? updateFunc(state, { ...payload, timestamp: Date.now() }, entityType) : state;
  if (newState !== undefined) {
    channel.state[entityType] = newState;
    state = newState;
  }

  const broadcastData = {
    userUuid,
    id: payload.id, // Ensure id is included in all chat broadcasts
    ...(operation === 'add' ? { text: payload.text, color: payload.color, timestamp: Date.now() } : {}), // Add timestamp for add
    ...(operation === 'update' ? { text: payload.text, timestamp: Date.now() } : {}), // Add timestamp for update
    ...(operation === 'remove' ? {} : {}), // No additional fields for remove
    ...(operation === 'reorder' ? { order: payload.order } : {}),
  };
  broadcastToChannel(channelName, type, broadcastData, userUuid);

  // Save state to file only if necessary
  if (shouldSave) {
    await saveStateToServer(channelName, entityType, channel.state[entityType]);
  }
}

function createRealTimeServers(server, corsOptions) {
  const io = new Server(server, {
    cors: corsOptions || { origin: '*' },
    pingInterval: 5000,
    pingTimeout: 10000,
    maxHttpBufferSize: 1e8,
  });

  io.on('connection', async (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-channel', async (data) => {
      if (!validateJoinData(data)) {
        socket.emit('message', { type: 'error', message: 'Invalid channel name or data', timestamp: Date.now() });
        return;
      }

      const { userUuid, displayName, channelName, color } = data; // Extract color from payload

      console.log("display and color", data)
      socket.join(channelName);
      socket.userUuid = userUuid;

      if (!channels.has(channelName)) {
        const initialState = {};
        for (const entityType of Object.keys(entityConfigs)) {
          initialState[entityType] = await loadStateFromServer(channelName, entityType);
        }
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

      // Use the color provided by the client, or a default if not provided
      const userColor = color || '#808080'; // Default to grey if no color is provided
      channel.users[userUuid] = { displayName, color: userColor, joinedAt: Date.now() };
      channel.sockets[userUuid] = socket;

      socket.emit('message', {
        type: 'init-state',
        userUuid,
        channelName,
        timestamp: Date.now(),
        state: channel.state,
      });

      broadcastToChannel(channelName, 'user-list', { users: channel.users });
      broadcastToChannel(channelName, 'user-joined', { userUuid, displayName, color: userColor, timestamp: Date.now() });
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
    case 'add-chat':
      await handleCrudOperation(channelName, userUuid, 'add-chat', { 
        id: payload.id, 
        text: payload.text, 
        color: payload.color, 
        userUuid 
      }, socket);
      break;
    case 'draft-chat':
      // Handle draft messages (broadcast with server timestamp, but don't save to JSON)
      const draftTimestamp = Date.now();
      broadcastToChannel(channelName, 'draft-chat', { 
        id: payload.id, 
        userUuid, 
        text: payload.text, 
        timestamp: draftTimestamp 
      }, userUuid);
      break;
    case 'update-chat':
      await handleCrudOperation(channelName, userUuid, 'update-chat', { 
        id: payload.id, 
        text: payload.text, 
        userUuid 
      }, socket);
      break;
    case 'delete-chat':
      await handleCrudOperation(channelName, userUuid, 'delete-chat', { id: payload.id, userUuid }, socket);
      break;
    case 'add-goal':
      await handleCrudOperation(channelName, userUuid, 'add-goal', { id: payload.id, text: payload.text, userUuid }, socket);
      break;
    case 'update-goal':
      await handleCrudOperation(channelName, userUuid, 'update-goal', { id: payload.id, text: payload.text, userUuid }, socket);
      break;
    case 'remove-goal':
      await handleCrudOperation(channelName, userUuid, 'remove-goal', { id: payload.id, userUuid }, socket);
      break;
    case 'reorder-goals':
      await handleCrudOperation(channelName, userUuid, 'reorder-goals', { order: payload.order, userUuid }, socket);
      break;
    case 'add-agent':
      await handleCrudOperation(channelName, userUuid, 'add-agent', { agent: payload.agent, userUuid }, socket);
      break;
    case 'update-agent':
      await handleCrudOperation(channelName, userUuid, 'update-agent', { agent: payload.agent, userUuid }, socket);
      break;
    case 'remove-agent':
      await handleCrudOperation(channelName, userUuid, 'remove-agent', { agentId: payload.agentId, userUuid }, socket);
      break;
    case 'add-clip':
      await handleCrudOperation(channelName, userUuid, 'add-clip', { clip: payload.clip, userUuid }, socket);
      break;
    case 'remove-clip':
      await handleCrudOperation(channelName, userUuid, 'remove-clip', { clipId: payload.clipId, userUuid }, socket);
      break;
    case 'add-document':
      await handleCrudOperation(channelName, userUuid, 'add-document', { document: payload.document, userUuid }, socket);
      break;
    case 'remove-document':
      await handleCrudOperation(channelName, userUuid, 'remove-document', { documentId: payload.documentId, userUuid }, socket);
      break;
    case 'rename-document':
      await handleCrudOperation(channelName, userUuid, 'rename-document', { id: payload.documentId, name: payload.name, userUuid }, socket);
      break;
    case 'add-question':
      await handleCrudOperation(channelName, userUuid, 'add-question', { question: payload.question, userUuid }, socket);
      break;
    case 'update-question':
      await handleCrudOperation(channelName, userUuid, 'update-question', { question: payload.question, userUuid }, socket);
      break;
    case 'remove-question':
      await handleCrudOperation(channelName, userUuid, 'remove-question', { questionId: payload.questionId, userUuid }, socket);
      break;
    case 'reorder-questions':
      await handleCrudOperation(channelName, userUuid, 'reorder-questions', { order: payload.questions, userUuid }, socket);
      break;
    case 'add-artifact':
      await handleCrudOperation(channelName, userUuid, 'add-artifact', { artifact: payload.artifact, userUuid }, socket);
      break;
    case 'remove-artifact':
      await handleCrudOperation(channelName, userUuid, 'remove-artifact', { artifactId: payload.artifactId, userUuid }, socket);
      break;
    case 'add-transcript':
      await handleCrudOperation(channelName, userUuid, 'add-transcript', { transcript: payload.transcript, userUuid }, socket);
      break;
    case 'remove-transcript':
      await handleCrudOperation(channelName, userUuid, 'remove-transcript', { transcriptId: payload.transcriptId, userUuid }, socket);
      break;
    case 'room-lock-toggle':
      channel.locked = payload.locked;
      broadcastToChannel(channelName, type, { channelName, locked: payload.locked, userUuid });
      // Save lock state in all entity files (if needed, or just in a separate lock file)
      for (const entityType of Object.keys(entityConfigs)) {
        await saveStateToServer(channelName, entityType, channel.state[entityType]);
      }
      break;
    case 'upload-to-cloud':
      console.log("Upload to Cloud");
      for (const entityType of Object.keys(entityConfigs)) {
        await saveStateToServer(channelName, entityType, channel.state[entityType]);
      }
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