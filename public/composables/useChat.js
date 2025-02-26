import { useRealTime } from './useRealTime.js';

const messages = Vue.ref([]); // Store only confirmed messages
const draftMessages = Vue.ref({}); // Store draft (pending) messages per userUuid
const { emit, on, off, activeUsers, userUuid, userColor } = useRealTime(); // Added userColor

// Store event handlers for cleanup
const eventHandlers = new WeakMap();

export function useChat() {
  if (!eventHandlers.has(useChat)) {
    const handlers = {};

    // Define handler functions
    handlers.handleAddChat = function ({ id, userUuid: senderUuid, text, color, timestamp }) {
      if (typeof text !== 'string') {
        console.warn('Invalid text in add-chat event, expected string:', text);
        return;
      }
      if (!id) {
        console.warn('Missing id in add-chat event, generating a new one:', { userUuid: senderUuid, text });
        id = uuidv4(); // Fallback if id is missing
      }
      // Use the provided color or fall back to userColor for the sender, then generateRandomColor
      const finalColor = color || (senderUuid === userUuid.value ? userColor.value : getUserColor(senderUuid)) || generateRandomColor();
      // Remove any draft message for this user
      if (draftMessages.value[senderUuid]) delete draftMessages.value[senderUuid];
      messages.value.push({
        id,
        userUuid: senderUuid,
        text: text.trim(),
        isDraft: false,
        color: finalColor,
        timestamp: timestamp || Date.now(), // Use server timestamp if provided, fallback to client time
      });
      messages.value = [...messages.value]; // Ensure reactivity
    };

    handlers.handleDraftChat = function ({ id, userUuid: senderUuid, text, timestamp }) {
      if (typeof text !== 'string') {
        console.warn('Invalid text in draft-chat event, expected string:', text);
        return;
      }
      if (!id) {
        console.warn('Missing id in draft-chat event, generating a new one:', { userUuid: senderUuid, text });
        id = uuidv4(); // Fallback if id is missing
      }
      // Only update if text is non-empty or explicitly clearing
      if (text.trim() || text === '') {
        const draftMsg = {
          id,
          userUuid: senderUuid,
          text: text.trim(),
          isDraft: true,
          timestamp: timestamp || Date.now(), // Use server timestamp if provided, fallback to client time
          color: '#4B5563', // Grey for drafts
          displayNameSuffix: '(typing)', // Add (typing) suffix for drafts
        };
        //console.log('Draft message created:', draftMsg);
        draftMessages.value[senderUuid] = draftMsg;
      } else if (!text) {
        // Clear draft message if text is undefined or null
        //console.log(`Clearing draft for user ${senderUuid}`);
        delete draftMessages.value[senderUuid];
      }
      draftMessages.value = { ...draftMessages.value }; // Ensure reactivity
    };

    handlers.handleUpdateChat = function ({ id, text, userUuid: senderUuid, timestamp }) {
      if (typeof text !== 'string') {
        console.warn('Invalid text in update-chat event, expected string:', text);
        return;
      }
      if (!id) {
        console.warn('Missing id in update-chat event:', { text, userUuid: senderUuid });
        return;
      }
      const message = messages.value.find(m => m.id === id && m.userUuid === senderUuid);
      if (message) {
        message.text = text.trim();
        message.timestamp = timestamp || Date.now(); // Update timestamp with server time if provided
        messages.value = [...messages.value]; // Ensure reactivity
      }
    };

    handlers.handleDeleteChat = function ({ id, userUuid: senderUuid }) {
      if (!id) {
        console.warn('Missing id in delete-chat event:', { userUuid: senderUuid });
        return;
      }
      //console.log(`Deleting message with ID ${id} for user ${senderUuid}`);
      messages.value = messages.value.filter(m => !(m.id === id && m.userUuid === senderUuid));
      messages.value = [...messages.value]; // Ensure reactivity
    };

    handlers.handleSnapshot = function (history) {
      messages.value = (history.chat || []).map(msg => ({
        ...msg,
        color: msg.color || getUserColor(msg.userUuid) || generateRandomColor(),
        timestamp: msg.timestamp || Date.now(), // Ensure timestamp is included or default to now
      }));
      draftMessages.value = {}; // Reset draft messages on snapshot
    };

    handlers.handleUserJoined = function (data) {
      if (!activeUsers.value[data.userUuid]?.color) {
        activeUsers.value = {
          ...activeUsers.value,
          [data.userUuid]: {
            ...activeUsers.value[data.userUuid],
            color: activeUsers.value[data.userUuid]?.color || generateRandomColor(),
          },
        };
      }
    };

    // Register event listeners
    handlers.addChat = on('add-chat', handlers.handleAddChat);
    handlers.draftChat = on('draft-chat', handlers.handleDraftChat);
    handlers.updateChat = on('update-chat', handlers.handleUpdateChat);
    handlers.deleteChat = on('delete-chat', handlers.handleDeleteChat);
    handlers.snapshot = on('history-snapshot', handlers.handleSnapshot);
    handlers.userJoined = on('user-joined', handlers.handleUserJoined);

    eventHandlers.set(useChat, handlers);
  }

  const handlers = eventHandlers.get(useChat);

  function sendMessage(text) {
    if (typeof text !== 'string' || !text.trim()) {
      console.warn('Invalid text in sendMessage, expected non-empty string:', text);
      return;
    }
    // Use userColor from useRealTime.js for consistency
    const color = userColor.value || generateRandomColor();
    const id = uuidv4(); // Generate a unique, consistent ID for the message
    // Update locally before emitting to ensure sender sees the message immediately
    handlers.handleAddChat({ id, userUuid: userUuid.value, text: text.trim(), color });
    emit('add-chat', { id, text: text.trim(), color, userUuid: userUuid.value });
    // Clear draft message for this user after sending
    if (draftMessages.value[userUuid.value]) delete draftMessages.value[userUuid.value];
    draftMessages.value = { ...draftMessages.value }; // Ensure reactivity
  }

  function updateDraft(text) {
    // Handle local draft updates and emit to server with a consistent ID
    if (typeof text !== 'string') {
      console.warn('Invalid text in updateDraft, expected string:', text);
      return;
    }
    // Use the existing draft ID if it exists, or generate a new one
    let draftId = draftMessages.value[userUuid.value]?.id || uuidv4();
    handlers.handleDraftChat({ id: draftId, userUuid: userUuid.value, text: text || '' });
    emit('draft-chat', { id: draftId, userUuid: userUuid.value, text: text || '' }); // Emit to server for broadcasting
  }

  function updateChat(id, text) {
    if (typeof text !== 'string' || !text.trim() || !id) {
      console.warn('Invalid parameters in updateChat, expected non-empty string id and text:', { id, text });
      return;
    }
    emit('update-chat', { id, text: text.trim(), userUuid: userUuid.value });
  }

  function deleteChat(id) {
    if (!id) {
      console.warn('Invalid id in deleteChat, expected non-empty id:', { id });
      return;
    }
    // Remove locally before emitting to ensure immediate feedback
    messages.value = messages.value.filter(m => !(m.id === id && m.userUuid === userUuid.value));
    messages.value = [...messages.value]; // Ensure reactivity
    emit('delete-chat', { id, userUuid: userUuid.value });
  }

  // Helper to get or generate a user's color
  function getUserColor(userUuid) {
    // Prioritize userColor for the local user, otherwise use activeUsers
    if (userUuid === userUuid.value) {
      return userColor.value;
    }
    return activeUsers.value[userUuid]?.color;
  }

  // Generate a random color for users
  function generateRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Cleanup function for components to call
  function cleanup() {
    const handlers = eventHandlers.get(useChat);
    if (handlers) {
      off('add-chat', handlers.addChat);
      off('draft-chat', handlers.draftChat);
      off('update-chat', handlers.updateChat);
      off('delete-chat', handlers.deleteChat);
      off('history-snapshot', handlers.snapshot);
      off('user-joined', handlers.handleUserJoined);
      eventHandlers.delete(useChat);
    }
  }

  return {
    messages,
    draftMessages,
    sendMessage,
    updateDraft,
    updateChat,
    deleteChat,
    activeUsers,
    cleanup,
  };
}