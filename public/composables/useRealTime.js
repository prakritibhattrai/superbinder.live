// useRealTime.js
import { useConfigs } from './useConfigs.js';
import eventBus from './eventBus.js';

const { env } = useConfigs();
let socket = null;
const userUuid = Vue.ref(localStorage.getItem('userUuid') || null);
const displayName = Vue.ref(localStorage.getItem('displayName') || '');
const channelName = Vue.ref(localStorage.getItem('channelName') || '');
const isConnected = Vue.ref(false);
const activeUsers = Vue.ref({});
const connectionError = Vue.ref(null);
const lastMessageTimestamp = Vue.ref(0); // Track message ordering

// Reactive session info
const sessionInfo = Vue.computed(() => ({
  userUuid: userUuid.value,
  displayName: displayName.value,
  channelName: channelName.value,
  isConnected: isConnected.value,
  error: connectionError.value,
}));

export function useRealTime() {
  // Initialize or reconnect to Socket.io
  function connect(channel, name) {
    if (!userUuid.value) {
      userUuid.value = uuidv4();
      localStorage.setItem('userUuid', userUuid.value);
    }

    displayName.value = name;
    channelName.value = channel;
    localStorage.setItem('displayName', name);
    localStorage.setItem('channelName', channel);

    if (!socket || !socket.connected) {
      socket = io(env.value.API_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 3000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 20000,
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        isConnected.value = true;
        connectionError.value = null;
        console.log(`Connected to server with UUID: ${userUuid.value}`);
        socket.emit('join-channel', {
          userUuid: userUuid.value,
          displayName: displayName.value,
          channelName: channelName.value,
        });
        startHeartbeat();
      });

      socket.on('disconnect', (reason) => {
        isConnected.value = false;
        stopHeartbeat();
        console.log(`Disconnected from server: ${reason}`);
        if (reason === 'io server disconnect' || reason === 'transport close') {
          connectionError.value = `Disconnected: ${reason}`;
          reconnect();
        }
      });

      socket.on('connect_error', (error) => {
        isConnected.value = false;
        connectionError.value = `Connection failed: ${error.message}`;
        console.error('Connection error:', error);
      });

      socket.on('message', (data) => {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        handleMessage(parsedData);
      });
    }
  }

  // Disconnect from the server
  function disconnect() {
    if (socket && socket.connected) {
      socket.emit('leave-channel', {
        userUuid: userUuid.value,
        channelName: channelName.value,
      });
      socket.disconnect();
      isConnected.value = false;
      stopHeartbeat();
      socket = null;
      connectionError.value = null;
    }
  }

  // Emit a message to the server
  function emit(event, data) {
    if (socket && socket.connected) {
      const payload = {
        userUuid: userUuid.value,
        channelName: channelName.value,
        timestamp: Date.now(),
        type: event, // Align with server-side expectation
        ...data,
      };
      socket.emit('message', payload);
    } else {
      console.error('Socket not connected. Queuing message:', event, data);
      connectionError.value = 'Cannot send: Not connected';
      // TODO: Implement message queue for offline resilience
    }
  }

  // Manual reconnect attempt
  function reconnect() {
    if (!isConnected.value) {
      console.log('Attempting to reconnect...');
      disconnect();
      connect(channelName.value, displayName.value);
    }
  }

  // Heartbeat to keep connection alive
  let heartbeatInterval = null;
  function startHeartbeat() {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
      emit('heartbeat', { type: 'ping' });
    }, 5000);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  // Handle incoming socket messages and route via eventBus
  function handleMessage(data) {
    if (!data.type || !data.timestamp) {
      console.warn('Invalid message format:', data);
      return;
    }

    // Prevent processing older messages
    if (data.timestamp <= lastMessageTimestamp.value) {
      console.log('Ignoring outdated message:', data);
      return;
    }
    lastMessageTimestamp.value = data.timestamp;

    console.log(`Received ${data.type} from ${data.userUuid || 'server'}:`, data);

    switch (data.type) {
      case 'user-list':
        activeUsers.value = data.users;
        eventBus.$emit('user-list', data.users);
        break;
      case 'add-document':
        eventBus.$emit('add-document', data.document);
        break;
      case 'remove-document':
        eventBus.$emit('remove-document', data.documentId);
        break;
      case 'add-clip':
        eventBus.$emit('add-clip', data.clip);
        break;
      case 'remove-clip':
        eventBus.$emit('remove-clip', data.clipId);
        break;
      case 'vote-clip':
        eventBus.$emit('vote-clip', { clipId: data.clipId, direction: data.direction });
        break;
      case 'transcription-update':
        eventBus.$emit('transcription-update', { userUuid: data.userUuid, sentence: data.sentence });
        break;
      case 'flag-sentence':
        eventBus.$emit('flag-sentence', { userUuid: data.userUuid, sentenceId: data.sentenceId });
        break;
      case 'add-synthesis':
        eventBus.$emit('add-synthesis', data.synthesis);
        break;
      case 'remove-synthesis':
        eventBus.$emit('remove-synthesis', data.synthesisId);
        break;
      case 'chat-draft':
        eventBus.$emit('chat-draft', { userUuid: data.userUuid, text: data.text });
        break;
      case 'chat-message':
        eventBus.$emit('chat-message', { userUuid: data.userUuid, text: data.text, color: data.color });
        break;
      case 'agent-message':
        eventBus.$emit('agent-message', { agentId: data.agentId, text: data.text, color: data.color });
        break;
      case 'pong':
        console.log('Heartbeat pong received');
        break;
      case 'error':
        console.error('Server error:', data.message);
        connectionError.value = data.message;
        break;
      default:
        console.warn('Unhandled message type:', data.type);
    }
  }

  // Expose event listener method
  function on(event, callback) {
    eventBus.$on(event, callback);
  }

  // Cleanup listener method (optional)
  function off(event, callback) {
    eventBus.$off(event, callback);
  }

  return {
    socket,
    userUuid,
    displayName,
    channelName,
    isConnected,
    activeUsers,
    connectionError,
    sessionInfo,
    connect,
    disconnect,
    emit,
    reconnect,
    on,
    off,
  };
}