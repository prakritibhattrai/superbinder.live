// components/Viewer.vue
import ViewerGoals from './ViewerGoals.js';
import ViewerAgents from './ViewerAgents.js';
import ViewerDocuments from './ViewerDocuments.js';
import ViewerClips from './ViewerClips.js';
import ViewerTranscribe from './ViewerTranscribe.js';
import ViewerQuestions from './ViewerQuestions.js';
import ViewerArtifacts from './ViewerArtifacts.js';
import ViewerUploads from './ViewerUploads.js';
import ViewerDashboard from './ViewerDashboard.js';
import GraphSummarizer from './GraphSummarizer.js';
import { useRealTime } from '../composables/useRealTime.js';
import { useHistory } from '../composables/useHistory.js';

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
    ViewerDashboard,
    GraphSummarizer,
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
    const { gatherLocalHistory } = useHistory();

    function updateActiveTab(tab, subTab = null) {
      emit('update-tab', { tab, subTab });
    }
    
    // Check if documents exist for the Graph tab
    function hasDocuments() {
      const history = gatherLocalHistory();
      return (history.documents || []).length > 0;
    }

    return {
      updateActiveTab,
      hasDocuments
    };
  },
  template: `
    <div class="h-full overflow-y-auto p-4">
      <viewer-dashboard v-show="activeTab === 'Dashboard'" :update-tab="updateTab" /> <!-- Pass updateTab as prop -->
      <viewer-goals v-show="activeTab === 'Goals'" />
      <viewer-agents v-show="activeTab === 'Agents'" />
      <viewer-documents v-show="activeTab === 'Documents' && activeDocumentSubTab === 'Viewer'" />
      <viewer-clips v-show="activeTab === 'Documents' && activeDocumentSubTab === 'Clips'" />
      <viewer-transcribe v-show="activeTab === 'Transcriptions'" />
      <viewer-questions v-show="activeTab === 'Q&A'" />
      <viewer-artifacts v-show="activeTab === 'Artifacts'" />
      <graph-summarizer v-show="activeTab === 'Graph'" />
      <viewer-uploads 
        v-show="activeTab === 'Documents' && activeDocumentSubTab === 'Uploads'" 
        :update-tab="updateTab"
      />
    </div>
  `,
};