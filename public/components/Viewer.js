// components/Viewer.vue
import ViewerGoals from './ViewerGoals.js';
import ViewerAgents from './ViewerAgents.js';
import ViewerDocuments from './ViewerDocuments.js';
import ViewerClips from './ViewerClips.js';
import ViewerTranscribe from './ViewerTranscribe.js';
import ViewerQuestions from './ViewerQuestions.js';
import ViewerArtifacts from './ViewerArtifacts.js';
import ViewerUploads from './ViewerUploads.js';
import { useRealTime } from '../composables/useRealTime.js';

export default {
  name: 'Viewer',
  components: {
    ViewerGoals,
    ViewerAgents,
    ViewerDocuments,
    ViewerClips,
    ViewerTranscribe,
    ViewerQuestions,
    ViewerArtifacts,
    ViewerUploads,
  },
  props: {
    activeTab: {
      type: String,
      required: true,
    },
    activeDocumentSubTab: {
      type: String,
      default: 'Uploads',
    },
    updateTab: {
      type: Function,
      required: true,
    },
  },
  setup(props) {
    const { emit } = useRealTime();

    function updateActiveTab(tab, subTab = null) {
      emit('update-tab', { tab, subTab });
    }

    return {
      updateActiveTab,
    };
  },
  template: `
    <div class="h-full overflow-y-auto p-4">
      <viewer-goals v-show="activeTab === 'Goals'" />
      <viewer-agents v-show="activeTab === 'Agents'" />
      <viewer-documents v-show="activeTab === 'Documents' && activeDocumentSubTab === 'Viewer'" />
      <viewer-clips v-show="activeTab === 'Documents' && activeDocumentSubTab === 'Clips'" />
      <viewer-transcribe v-show="activeTab === 'Transcriptions'" />
      <viewer-questions v-show="activeTab === 'Q&A'" />
      <viewer-artifacts v-show="activeTab === 'Artifacts'" />
      <viewer-uploads 
        v-show="activeTab === 'Documents' && activeDocumentSubTab === 'Uploads'" 
        :update-tab="updateTab"
      />
    </div>
  `,
};