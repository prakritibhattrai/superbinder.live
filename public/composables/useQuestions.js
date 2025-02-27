import { useRealTime } from './useRealTime.js';

const questions = Vue.ref([]);
const answers = Vue.ref([]);

const { emit, on, off } = useRealTime();

export function useQuestions() {
  // Event handlers
  const handleSyncHistoryData = (state) => {
    questions.value = state.questions || [];
    answers.value = state.answers || [];
  };

const handleAddQuestion = (data) => {
  // console.log("Handle question add", data)
  const question = { id: data.id, text: data.text, order: data.order, answers: data.answers || [] };
  if (!questions.value.some(q => q.id === question.id)) {
    questions.value.push(question);
  }
};

  const handleUpdateQuestion = ({ id, text }) => {
    const question = questions.value.find(q => q.id === id);
    if (question) question.text = text;
  };

  const handleDeleteQuestion = ({ id }) => {
    questions.value = questions.value.filter(q => q.id !== id);
  };

  const handleReorderQuestions = ({ order }) => {
    questions.value = order.map((id, index) => {
      const question = questions.value.find(q => q.id === id);
      return { ...question, order: index };
    }).sort((a, b) => a.order - b.order);
  };

  const handleAddAnswer = ({ id, questionId, text }) => {
    if (!answers.value.some(a => a.id === id)) {
      answers.value.push({ id, questionId, text, votes: 0 });
    }
    const question = questions.value.find(q => q.id === questionId);
    if (question && !question.answers.includes(id)) {
      question.answers.push(id);
    }
  };

  const handleUpdateAnswer = ({ id, questionId, text }) => {
    const answer = answers.value.find(a => a.id === id);
    if (answer) answer.text = text;
  };

  const handleDeleteAnswer = ({ id, questionId }) => {
    answers.value = answers.value.filter(a => a.id !== id);
    const question = questions.value.find(q => q.id === questionId);
    if (question) question.answers = question.answers.filter(aId => aId !== id);
  };

  const handleVoteAnswer = ({ questionId, answerId, vote, votes }) => {
    // console.log('Vote received:', { questionId, answerId, vote, votes });
    const answer = answers.value.find(a => a.id === answerId);
    if (votes !== undefined) {
      // Server broadcast
      if (answer) {
        // console.log('Updating votes for', answerId, 'to', votes);
        answer.votes = votes;
      } else {
        console.warn(`Vote received for unknown answer ${answerId} in question ${questionId}`);
      }
    } else {
      // Local vote
      if (answer) {
        // console.log('Local vote for', answerId, 'with', vote);
        answer.votes = (answer.votes || 0) + (vote === 'up' ? 1 : -1);
        emit('vote-answer', { questionId, id: answerId, vote });
      } else {
        console.warn(`Local vote failed: Answer ${answerId} not found`);
      }
    }
  };

  // Register listeners
  on('sync-history-data', handleSyncHistoryData);
  on('add-question', handleAddQuestion);
  on('update-question', handleUpdateQuestion);
  on('remove-question', handleDeleteQuestion);
  on('reorder-questions', handleReorderQuestions);
  on('add-answer', handleAddAnswer);
  on('update-answer', handleUpdateAnswer);
  on('delete-answer', handleDeleteAnswer);
  on('vote-answer', handleVoteAnswer);

  // Computed property to merge questions with their answers, sorted by votes
  const questionsWithAnswers = Vue.computed(() => {
    const result = questions.value.map(question => ({
      ...question,
      answers: (question.answers || []).map(answerId => answers.value.find(a => a.id === answerId)).filter(Boolean).sort((a, b) => (b.votes || 0) - (a.votes || 0)),
    })).sort((a, b) => a.order - b.order);
    // console.log('Computed questionsWithAnswers:', result);
    return result;
  });

  // Actions
  const addQuestion = (text) => {
    const id = uuidv4();
    const question = { id, text, order: questions.value.length, answers: [] };
    questions.value.push(question);
    emit('add-question', { question });
  };

  const updateQuestion = (id, text) => {
    const question = questions.value.find(q => q.id === id);
    if (question) {
      question.text = text;
      emit('update-question', { id, text });
    }
  };

  const deleteQuestion = (id) => {
    questions.value = questions.value.filter(q => q.id !== id);
    emit('remove-question', { id });
  };

  const reorderQuestions = (draggedId, newIndex) => {
    const currentIndex = questions.value.findIndex(q => q.id === draggedId);
    const newOrder = [...questions.value];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    newOrder.forEach((q, i) => q.order = i);
    questions.value = newOrder;
    emit('reorder-questions', { order: newOrder.map(q => q.id) });
  };

  const addAnswer = (questionId) => {
    const id = uuidv4();
    answers.value.push({ id, questionId, text: '', votes: 0 });
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      question.answers.push(id);
      emit('add-answer', { id, questionId, text: '' });
    }
    return id;
  };

  const updateAnswer = (id, questionId, text) => {
    const answer = answers.value.find(a => a.id === id);
    if (answer) {
      answer.text = text;
      emit('update-answer', { id, questionId, text });
    }
  };

  const deleteAnswer = (id, questionId) => {
    answers.value = answers.value.filter(a => a.id !== id);
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      question.answers = question.answers.filter(aId => aId !== id);
      emit('delete-answer', { id, questionId });
    }
  };

  const voteAnswer = (questionId, id, vote) => {
    handleVoteAnswer({ questionId, answerId: id, vote });
  };

  const cleanup = () => {
    off('sync-history-data', handleSyncHistoryData);
    off('add-question', handleAddQuestion);
    off('update-question', handleUpdateQuestion);
    off('remove-question', handleDeleteQuestion);
    off('reorder-questions', handleReorderQuestions);
    off('add-answer', handleAddAnswer);
    off('update-answer', handleUpdateAnswer);
    off('delete-answer', handleDeleteAnswer);
    off('vote-answer', handleVoteAnswer);
  };

  return {
    questions,
    questionsWithAnswers,
    rawQuestions: questions,
    rawAnswers: answers,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    addAnswer,
    updateAnswer,
    deleteAnswer,
    voteAnswer,
    cleanup,
  };
}