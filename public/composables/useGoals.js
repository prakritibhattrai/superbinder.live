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

  function handleReorderGoals(newOrder) {
    goals.value = newOrder.map((id, index) => {
      const goal = goals.value.find(g => g.id === id);
      return { ...goal, order: index };
    }).sort((a, b) => a.order - b.order);
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
    const newOrder = [...goals.value];
    const [movedGoal] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, movedGoal);
    newOrder.forEach((goal, index) => goal.order = index);
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