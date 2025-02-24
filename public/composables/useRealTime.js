// composables/useRealTime.js
import { useConfigs } from './useConfigs.js';
import eventBus from './eventBus.js';

const { env } = useConfigs();

// Singleton socket instance
let socket = null;
const userUuid = Vue.ref(localStorage.getItem('userUuid') || null);
const displayName = Vue.ref(localStorage.getItem('displayName') || '');
const channelName = Vue.ref(localStorage.getItem('channelName') || '');
const isConnected = Vue.ref(false);
const activeUsers = Vue.ref({});
const connectionError = Vue.ref(null);
const lastMessageTimestamp = Vue.ref(0);

const sessionInfo = Vue.computed(() => ({
  userUuid: userUuid.value,
  displayName: displayName.value,
  channelName: channelName.value,
  isConnected: isConnected.value,
  error: connectionError.value,
}));

export function useRealTime() {
  function initializeSocket() {
    if (socket) {
      if (socket.connected) {
        console.log('Socket already connected, reusing existing connection');
        isConnected.value = true;
        return;
      } else {
        console.log('Cleaning up stale socket');
        socket.disconnect();
        socket = null;
      }
    }

    const apiUrl = env.value.API_URL;
    socket = io(apiUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20000,
      transports: ['websocket'],
      path: '/socket.io',
    });

    socket.on('connect', () => {
      isConnected.value = true;
      connectionError.value = null;
      console.log(`Connected to server with UUID: ${userUuid.value}, Socket ID: ${socket.id}`);
      if (channelName.value && displayName.value) {
        socket.emit('join-channel', {
          userUuid: userUuid.value,
          displayName: displayName.value,
          channelName: channelName.value,
        });
      }
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

  function connect(channel, name) {
    if (!userUuid.value) {
      userUuid.value = uuidv4();
      localStorage.setItem('userUuid', userUuid.value);
    }

    displayName.value = name;
    channelName.value = channel;
    localStorage.setItem('displayName', name);
    localStorage.setItem('channelName', channel);

    initializeSocket();
  }

  function disconnect() {
    if (socket && socket.connected) {
      socket.emit('leave-channel', { userUuid: userUuid.value, channelName: channelName.value });
      socket.disconnect();
      isConnected.value = false;
      stopHeartbeat();
      socket = null;
      connectionError.value = null;
    }
  }

  function emit(event, data) {
    if (socket && socket.connected) {
      const payload = {
        userUuid: userUuid.value,
        channelName: channelName.value,
        timestamp: Date.now(),
        type: event,
        ...data,
      };
      socket.emit('message', payload);
    } else {
      console.error('Socket not connected. Queuing message:', event, data);
      connectionError.value = 'Cannot send: Not connected';
    }
  }

  function reconnect() {
    if (!isConnected.value) {
      console.log('Attempting to reconnect...');
      disconnect();
      connect(channelName.value, displayName.value);
    }
  }

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

  function handleMessage(data) {
    if (typeof data !== 'object' || !data.type) {
      console.error('Invalid message format: Missing type or not an object', data);
      return;
    }

    const processedData = {
      ...data,
      timestamp: data.timestamp || Date.now(),
    };

    if (['user-list', 'user-joined'].includes(processedData.type)) {
      console.log(`Processing critical update: ${processedData.type}`);
    } else if (processedData.timestamp <= lastMessageTimestamp.value) {
      console.log('Ignoring outdated message:', processedData);
      return;
    }
    lastMessageTimestamp.value = processedData.timestamp;

    console.log(`Received ${processedData.type} from ${processedData.userUuid || 'server'}:`, processedData);

    switch (processedData.type) {
      case 'user-list':
        activeUsers.value = processedData.users;
        eventBus.$emit('user-list', processedData.users);
        break;
      case 'user-joined':
        activeUsers.value = {
          ...activeUsers.value,
          [processedData.userUuid]: {
            displayName: processedData.displayName,
            color: processedData.color || generateRandomColor(), // Ensure color exists
          },
        };
        eventBus.$emit('user-joined', processedData);
        break;
      case 'request-history':
        const history = {
          //   documents: useDocuments().documents.value,
          //   clips: useClips().clips.value,
          //   messages: useChat().messages.value,
          //   goals: useGoals().goals.value,
          //   questions: useQuestions().questions.value,
        };
        emit('history-snapshot', { requesterUuid: processedData.requesterUuid, history });
        break;
      case 'history-snapshot':
        eventBus.$emit('history-snapshot', processedData.history);
        break;
      case 'chat-draft':
        eventBus.$emit('chat-draft', { userUuid: processedData.userUuid, text: processedData.text });
        break;
      case 'chat-message':
        eventBus.$emit('chat-message', { userUuid: processedData.userUuid, text: processedData.text, color: processedData.color });
        break;
      case 'agent-message':
        eventBus.$emit('agent-message', { agentId: processedData.agentId, text: processedData.text, color: processedData.color });
        break;
      case 'add-document':
        eventBus.$emit('add-document', processedData.document);
        break;
      case 'remove-document':
        eventBus.$emit('remove-document', { documentId: processedData.documentId });
        break;
      case 'rename-document':
        eventBus.$emit('rename-document', { documentId: processedData.documentId, newName: processedData.newName });
        break;
      case 'add-goal':
        eventBus.$emit('add-goal', processedData.goal);
        break;
      case 'update-goal':
        eventBus.$emit('update-goal', { id: processedData.id, text: processedData.text });
        break;
      case 'remove-goal':
        eventBus.$emit('remove-goal', { id: processedData.id });
        break;
      case 'reorder-goals':
        eventBus.$emit('reorder-goals', { order: processedData.order });
        break;
      case 'add-question':
        eventBus.$emit('add-question', processedData.question);
        break;
      case 'update-question':
        eventBus.$emit('update-question', { id: processedData.id, text: processedData.text });
        break;
      case 'remove-question':
        eventBus.$emit('remove-question', { id: processedData.id });
        break;
      case 'reorder-questions':
        eventBus.$emit('reorder-questions', { order: processedData.order });
        break;
      case 'add-answer':
        eventBus.$emit('add-answer', { questionId: processedData.questionId, answer: processedData.answer });
        break;
      case 'update-answer':
        eventBus.$emit('update-answer', { questionId: processedData.questionId, answerId: processedData.answerId, text: processedData.text });
        break;
      case 'remove-answer':
        eventBus.$emit('remove-answer', { questionId: processedData.questionId, answerId: processedData.answerId });
        break;
      case 'reorder-answers':
        eventBus.$emit('reorder-answers', { questionId: processedData.questionId, order: processedData.order });
        break;
      case 'vote-answer':
        eventBus.$emit('vote-answer', { questionId: processedData.questionId, answerId: processedData.answerId, vote: processedData.vote });
        break;
      case 'question-draft':
        eventBus.$emit('question-draft', { id: processedData.id, text: processedData.text });
        break;
      case 'answer-draft':
        eventBus.$emit('answer-draft', { questionId: processedData.questionId, answerId: processedData.answerId, text: processedData.text });
        break;
      case 'update-tab':
        eventBus.$emit('update-tab', { tab: processedData.tab });
        break;
      case 'add-agent':
        eventBus.$emit('add-agent', processedData.agent);
        break;
      case 'update-agent':
        eventBus.$emit('update-agent', processedData.agent);
        break;
      case 'remove-agent':
        eventBus.$emit('remove-agent', { name: processedData.name });
        break;
      case 'pong':
        console.log('Heartbeat pong received');
        break;
      case 'error':
        console.error('Server error:', processedData.message);
        connectionError.value = processedData.message;
        break;
      default:
        console.warn('Unhandled message type:', processedData.type);
    }
  }

  function generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  function on(event, callback) {
    eventBus.$on(event, callback);
  }

  function off(event, callback) {
    eventBus.$off(event, callback);
  }

  function loadSession() {
    if (userUuid.value && displayName.value && channelName.value) {
      initializeSocket();
    }
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
    loadSession,
  };
}