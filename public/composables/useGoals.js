import { useRealTime } from './useRealTime.js';

const goals = Vue.ref([]);
const { emit, on, off } = useRealTime();

const processedEvents = new Set();
const eventHandlers = new WeakMap();

export function useGoals() {
  function handleAddGoal(data) {
    //console.log('Received add-goal event:', data);
    const { id, text } = data;
    if (!id || !text) {
      console.warn('Invalid goal received in handleAddGoal: missing id or text', data);
      return;
    }
    const eventKey = `add-goal-${id}-${text}-${data.timestamp || Date.now()}`;
    if (!processedEvents.has(eventKey)) {
      processedEvents.add(eventKey);
      if (!goals.value.some(g => g.id === id)) {
        goals.value.push({ id, text, order: data.order ?? goals.value.length });
        goals.value = [...goals.value];
      }
      setTimeout(() => processedEvents.delete(eventKey), 1000);
    } else {
    //   console.warn('Duplicate add-goal event detected, ignoring:', data);
    }
  }

  function handleUpdateGoal(data) {
    //console.log('Received update-goal event:', data);
    const { id, text } = data;
    if (!id || typeof text !== 'string' || text.trim() === '') {
      console.warn('Invalid update-goal data: missing id or invalid text', data);
      return;
    }
    const goal = goals.value.find(g => g.id === id);
    if (goal) {
      goal.text = text.trim();
      goals.value = [...goals.value];
    } else {
      console.warn('Goal not found for update:', id);
    }
  }

  function handleRemoveGoal(data) {
    //console.log('Received remove-goal event:', data);
    const { id } = data;
    if (!id) {
      console.warn('Invalid remove-goal data: missing id', data);
      return;
    }
    const goalIndex = goals.value.findIndex(g => g.id === id);
    if (goalIndex !== -1) {
      goals.value = goals.value.filter(g => g.id !== id);
      goals.value.forEach((goal, index) => {
        goal.order = index;
      });
      goals.value = [...goals.value];
    } else {
    //   console.warn('Goal not found for removal:', id);
    }
  }

  function handleReorderGoals(data) {
    //console.log('Received reorder-goals event:', data);
    const { order } = data;
    if (!Array.isArray(order) || order.length === 0) {
      console.error('Invalid order format in reorder-goals event: expected non-empty array of IDs', order);
      return;
    }
    const eventKey = `reorder-goals-${order.join('-')}-${data.timestamp || Date.now()}`;
    if (!processedEvents.has(eventKey)) {
      processedEvents.add(eventKey);
      goals.value = order.map((id, index) => {
        const goal = goals.value.find(g => g.id === id);
        if (!goal) {
          console.warn(`Goal with ID ${id} not found for reordering`);
          return null;
        }
        return { ...goal, order: index };
      }).filter(Boolean).sort((a, b) => a.order - b.order);
      goals.value = [...goals.value];
      setTimeout(() => processedEvents.delete(eventKey), 1000);
    } else {
      console.warn('Duplicate reorder-goals event detected, ignoring:', order);
    }
  }

  const addGoalHandler = on('add-goal', handleAddGoal);
  const updateGoalHandler = on('update-goal', handleUpdateGoal);
  const removeGoalHandler = on('remove-goal', handleRemoveGoal);
  const reorderGoalsHandler = on('reorder-goals', handleReorderGoals);

  eventHandlers.set(useGoals, {
    add: addGoalHandler,
    update: updateGoalHandler,
    remove: removeGoalHandler,
    reorder: reorderGoalsHandler,
  });

  function addGoal(text) {
    if (!text || text.trim() === '') {
      console.warn('Attempted to add empty goal, ignoring');
      return;
    }
    const id = uuidv4();
    const goal = { id, text: text.trim(), order: goals.value.length };
    goals.value.push(goal);
    goals.value = [...goals.value];
    //console.log('Emitting add-goal:', { id, text, order: goals.value.length });
    emit('add-goal', { id, text, order: goals.value.length, timestamp: Date.now() });
  }

  function updateGoal(id, text) {
    if (!id || typeof text !== 'string' || text.trim() === '') {
      console.warn('Invalid updateGoal parameters: missing id or invalid text', { id, text });
      return;
    }
    const goal = goals.value.find(g => g.id === id);
    if (goal) {
      goal.text = text.trim();
      goals.value = [...goals.value];
      //console.log('Emitting update-goal:', { id, text: text.trim() });
      emit('update-goal', { id, text: text.trim(), timestamp: Date.now() });
    } else {
      console.warn('Goal not found for update:', id);
    }
  }

  function removeGoal(id) {
    if (!id) {
      console.warn('Invalid removeGoal parameter: missing id', { id });
      return;
    }
    const goalIndex = goals.value.findIndex(g => g.id === id);
    if (goalIndex !== -1) {
      goals.value = goals.value.filter(g => g.id !== id);
      goals.value.forEach((goal, index) => {
        goal.order = index;
      });
      goals.value = [...goals.value];
      //console.log('Emitting remove-goal:', { id });
      emit('remove-goal', { id, timestamp: Date.now() });
    } else {
      console.warn('Goal not found for removal:', id);
    }
  }

  function reorderGoals(draggedId, newIndex) {
    if (!draggedId) {
      console.warn('Invalid reorderGoals parameter: missing draggedId', { draggedId, newIndex });
      return;
    }
    const currentIndex = goals.value.findIndex(g => g.id === draggedId);
    if (currentIndex === -1) {
      console.warn(`Goal with ID ${draggedId} not found for reordering`);
      return;
    }

    const newOrder = [...goals.value];
    const [movedGoal] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, movedGoal);

    newOrder.forEach((goal, index) => {
      goal.order = index;
    });

    goals.value = newOrder;
    //console.log('Emitting reorder-goals:', { order: newOrder.map(g => g.id) });
    emit('reorder-goals', { order: newOrder.map(g => g.id), timestamp: Date.now() });
  }

  function addGoalProgrammatically(text) {
    addGoal(text);
  }

  function updateGoalProgrammatically(id, text) {
    updateGoal(id, text);
  }

  function cleanup() {
    const handlers = eventHandlers.get(useGoals);
    if (handlers) {
      off('add-goal', handlers.add);
      off('update-goal', handlers.update);
      off('remove-goal', handlers.remove);
      off('reorder-goals', handlers.reorder);
      eventHandlers.delete(useGoals);
    }
    processedEvents.clear();
  }

  return { goals, addGoal, updateGoal, removeGoal, reorderGoals, addGoalProgrammatically, updateGoalProgrammatically, cleanup };
}