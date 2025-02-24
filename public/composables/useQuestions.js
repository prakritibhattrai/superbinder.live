// composables/useQuestions.js
import { useRealTime } from './useRealTime.js';

const questions = Vue.ref([]);
const drafts = Vue.ref({}); // Track typing indicators for questions and answers
const { emit, on, off } = useRealTime();

export function useQuestions() {
  function handleAddQuestion(question) {
    if (!questions.value.some(q => q.id === question.id)) {
      questions.value.push(question);
    }
  }

  function handleUpdateQuestion({ id, text }) {
    const question = questions.value.find(q => q.id === id);
    if (question) {
      question.text = text;
    }
  }

  function handleRemoveQuestion({ id }) {
    questions.value = questions.value.filter(q => q.id !== id);
  }

  function handleReorderQuestions(newOrder) {
    questions.value = newOrder.map((id, index) => {
      const question = questions.value.find(q => q.id === id);
      return { ...question, order: index };
    }).sort((a, b) => a.order - b.order);
  }

  function handleAddAnswer({ questionId, answer }) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      if (!question.answers) question.answers = [];
      if (!question.answers.some(a => a.id === answer.id)) {
        question.answers.push(answer);
      }
    }
  }

  function handleUpdateAnswer({ questionId, answerId, text }) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      const answer = question.answers.find(a => a.id === answerId);
      if (answer) {
        answer.text = text;
      }
    }
  }

  function handleRemoveAnswer({ questionId, answerId }) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      question.answers = question.answers.filter(a => a.id !== answerId);
    }
  }

  function handleReorderAnswers({ questionId, newOrder }) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      question.answers = newOrder.map((id, index) => {
        const answer = question.answers.find(a => a.id === id);
        return { ...answer, order: index };
      }).sort((a, b) => a.order - b.order);
    }
  }

  function handleVoteAnswer({ questionId, answerId, vote }) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      const answer = question.answers.find(a => a.id === answerId);
      if (answer) {
        answer.votes = (answer.votes || 0) + (vote === 'up' ? 1 : -1);
        // Reorder answers by votes (highest to lowest)
        question.answers.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        emit('vote-answer', { questionId, answerId, vote });
      }
    }
  }

  function handleQuestionDraft({ id, text }) {
    drafts.value[id] = text;
  }

  function handleAnswerDraft({ questionId, answerId, text }) {
    if (!drafts.value[questionId]) drafts.value[questionId] = {};
    drafts.value[questionId][answerId] = text;
  }

  on('add-question', handleAddQuestion);
  on('update-question', handleUpdateQuestion);
  on('remove-question', handleRemoveQuestion);
  on('reorder-questions', handleReorderQuestions);
  on('add-answer', handleAddAnswer);
  on('update-answer', handleUpdateAnswer);
  on('remove-answer', handleRemoveAnswer);
  on('reorder-answers', handleReorderAnswers);
  on('vote-answer', handleVoteAnswer);
  on('question-draft', handleQuestionDraft);
  on('answer-draft', handleAnswerDraft);

  Vue.onUnmounted(() => {
    off('add-question', handleAddQuestion);
    off('update-question', handleUpdateQuestion);
    off('remove-question', handleRemoveQuestion);
    off('reorder-questions', handleReorderQuestions);
    off('add-answer', handleAddAnswer);
    off('update-answer', handleUpdateAnswer);
    off('remove-answer', handleRemoveAnswer);
    off('reorder-answers', handleReorderAnswers);
    off('vote-answer', handleVoteAnswer);
    off('question-draft', handleQuestionDraft);
    off('answer-draft', handleAnswerDraft);
  });

  function addQuestion(text) {
    const id = uuidv4();
    const question = { id, text, order: questions.value.length, answers: [] };
    questions.value.push(question);
    emit('add-question', { question });
  }

  function updateQuestion(id, text) {
    const question = questions.value.find(q => q.id === id);
    if (question) {
      question.text = text;
      emit('update-question', { id, text });
    }
  }

  function removeQuestion(id) {
    questions.value = questions.value.filter(q => q.id !== id);
    emit('remove-question', { id });
  }

  function reorderQuestions(draggedId, newIndex) {
    const currentIndex = questions.value.findIndex(q => q.id === draggedId);
    const newOrder = [...questions.value];
    const [movedQuestion] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, movedQuestion);
    newOrder.forEach((q, index) => q.order = index);
    questions.value = newOrder;
    emit('reorder-questions', { order: newOrder.map(q => q.id) });
  }

  function addAnswer(questionId, text) {
    const id = uuidv4();
    const answer = { id, text, votes: 0, order: 0 };
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      if (!question.answers) question.answers = [];
      question.answers.push(answer);
      emit('add-answer', { questionId, answer });
    }
  }

  function updateAnswer(questionId, answerId, text) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      const answer = question.answers.find(a => a.id === answerId);
      if (answer) {
        answer.text = text;
        emit('update-answer', { questionId, answerId, text });
      }
    }
  }

  function removeAnswer(questionId, answerId) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      question.answers = question.answers.filter(a => a.id !== answerId);
      emit('remove-answer', { questionId, answerId });
    }
  }

  function reorderAnswers(questionId, draggedId, newIndex) {
    const question = questions.value.find(q => q.id === questionId);
    if (question) {
      const currentIndex = question.answers.findIndex(a => a.id === draggedId);
      const newOrder = [...question.answers];
      const [movedAnswer] = newOrder.splice(currentIndex, 1);
      newOrder.splice(newIndex, 0, movedAnswer);
      newOrder.forEach((a, index) => a.order = index);
      question.answers = newOrder;
      emit('reorder-answers', { questionId, order: newOrder.map(a => a.id) });
    }
  }

  function voteAnswer(questionId, answerId, vote) {
    handleVoteAnswer({ questionId, answerId, vote });
  }

  function startQuestionDraft(id, text) {
    drafts.value[id] = text;
    emit('question-draft', { id, text });
  }

  function stopQuestionDraft(id) {
    delete drafts.value[id];
    emit('question-draft', { id, text: '' });
  }

  function startAnswerDraft(questionId, answerId, text) {
    if (!drafts.value[questionId]) drafts.value[questionId] = {};
    drafts.value[questionId][answerId] = text;
    emit('answer-draft', { questionId, answerId, text });
  }

  function stopAnswerDraft(questionId, answerId) {
    if (drafts.value[questionId]) {
      delete drafts.value[questionId][answerId];
      if (Object.keys(drafts.value[questionId]).length === 0) {
        delete drafts.value[questionId];
      }
    }
    emit('answer-draft', { questionId, answerId, text: '' });
  }

  // Programmatic addition/modification for AI or transcriptions/clips
  function addQuestionProgrammatically(text) {
    addQuestion(text);
  }

  function addAnswerProgrammatically(questionId, text) {
    addAnswer(questionId, text);
  }

  return {
    questions,
    drafts,
    addQuestion,
    updateQuestion,
    removeQuestion,
    reorderQuestions,
    addAnswer,
    updateAnswer,
    removeAnswer,
    reorderAnswers,
    voteAnswer,
    startQuestionDraft,
    stopQuestionDraft,
    startAnswerDraft,
    stopAnswerDraft,
    addQuestionProgrammatically,
    addAnswerProgrammatically,
  };
}