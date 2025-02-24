// composables/useGoals.js
import { useRealTime } from './useRealTime.js';

const goals = Vue.ref([]);
const { emit, on, off } = useRealTime();

export function useGoals() {
  function handleAddGoal(goal) {
    if (!goals.value.some(g => g.id === goal.id)) {
      goals.value.push(goal);
    }
  }

  function handleUpdateGoal({ id, text }) {
    const goal = goals.value.find(g => g.id === id);
    if (goal) {
      goal.text = text;
    }
  }

  function handleRemoveGoal({ id }) {
    goals.value = goals.value.filter(g => g.id !== id);
  }

  function handleReorderGoals({ order }) {
    if (!Array.isArray(order)) {
      console.error('Invalid order format in reorder-goals event: expected array of IDs, got', order);
      return;
    }
    // Map the order (array of IDs) to update the goals array with correct order
    goals.value = order.map((id, index) => {
      const goal = goals.value.find(g => g.id === id);
      if (!goal) {
        console.warn(`Goal with ID ${id} not found for reordering`);
        return null;
      }
      return { ...goal, order: index }; // Update order based on new position
    }).filter(goal => goal !== null) // Filter out any nulls if a goal isn’t found
      .sort((a, b) => a.order - b.order); // Sort by order for consistency
  }

  on('add-goal', handleAddGoal);
  on('update-goal', handleUpdateGoal);
  on('remove-goal', handleRemoveGoal);
  on('reorder-goals', handleReorderGoals);

  Vue.onUnmounted(() => {
    off('add-goal', handleAddGoal);
    off('update-goal', handleUpdateGoal);
    off('remove-goal', handleRemoveGoal);
    off('reorder-goals', handleReorderGoals);
  });

  function addGoal(text) {
    const id = uuidv4();
    const goal = { id, text, order: goals.value.length };
    goals.value.push(goal);
    emit('add-goal', { goal });
  }

  function updateGoal(id, text) {
    const goal = goals.value.find(g => g.id === id);
    if (goal) {
      goal.text = text;
      emit('update-goal', { id, text });
    }
  }

  function removeGoal(id) {
    goals.value = goals.value.filter(g => g.id !== id);
    emit('remove-goal', { id });
  }

  function reorderGoals(draggedId, newIndex) {
    const currentIndex = goals.value.findIndex(g => g.id === draggedId);
    if (currentIndex === -1) {
      console.warn(`Goal with ID ${draggedId} not found for reordering`);
      return;
    }

    const newOrder = [...goals.value];
    const [movedGoal] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, movedGoal);

    // Update order property for each goal based on new position
    newOrder.forEach((goal, index) => {
      goal.order = index;
    });

    goals.value = newOrder;
    emit('reorder-goals', { order: newOrder.map(g => g.id) });
  }

  // Programmatic addition/modification for AI or transcriptions
  function addGoalProgrammatically(text) {
    addGoal(text);
  }

  function updateGoalProgrammatically(id, text) {
    updateGoal(id, text);
  }

  return { goals, addGoal, updateGoal, removeGoal, reorderGoals, addGoalProgrammatically, updateGoalProgrammatically };
}