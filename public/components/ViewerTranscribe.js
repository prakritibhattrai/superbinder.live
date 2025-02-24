// components/ViewerTranscribe.js
import { useGoals } from '../composables/useGoals.js';
import { useQuestions } from '../composables/useQuestions.js';

export default {
  name: 'ViewerTranscribe',
  template: `
    <div class="h-full flex flex-col overflow-hidden p-4">
      <button class="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg">Record</button>
      <div class="mt-4 space-y-4 text-gray-300">
        <div v-for="sentence in transcriptions" :key="sentence.id" class="p-2 bg-gray-700 rounded-lg">
          <p>{{ sentence.text }}</p>
          <div class="flex gap-2 mt-2">
            <button @click="addGoalFromSentence(sentence.text)" class="py-1 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg">Add as Goal</button>
            <button @click="addQuestionFromSentence(sentence.text)" class="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add as Question</button>
          </div>
        </div>
        <div v-if="!transcriptions.length" class="text-gray-400">No transcriptions yet.</div>
      </div>
    </div>
  `,
  setup() {
    const { addGoalProgrammatically } = useGoals();
    const { addQuestionProgrammatically } = useQuestions();
    const transcriptions = Vue.ref([]); // Placeholder; implement real-time transcription logic here

    function addGoalFromSentence(text) {
      addGoalProgrammatically(text);
    }

    function addQuestionFromSentence(text) {
      addQuestionProgrammatically(text);
    }

    return { transcriptions, addGoalFromSentence, addQuestionFromSentence };
  },
};