// components/Viewer.vue
import ViewerGoals from './ViewerGoals.js';
import ViewerDocuments from './ViewerDocuments.js';
import ViewerClips from './ViewerClips.js';
import ViewerTranscribe from './ViewerTranscribe.js';
import ViewerQuestions from './ViewerQuestions.js';
import ViewerArtifacts from './ViewerArtifacts.js';
import Uploads from './Uploads.js'; // Renamed DocumentSidebar.js
import { useRealTime } from '../composables/useRealTime.js';

export default {
  name: 'Viewer',
  components: {
    ViewerGoals,
    ViewerDocuments,
    ViewerClips,
    ViewerTranscribe,
    ViewerQuestions,
    ViewerArtifacts,
    Uploads,
  },
  props: {
    activeTab: {
      type: String,
      required: true,
    },
    activeDocumentSubTab: {
      type: String,
      default: 'Uploads', // Default to Uploads for Documents
    },
  },
  setup() {
    const { emit } = useRealTime();

    // Sync tab changes via Socket.io (optional, since Binder.js handles this)
    function updateActiveTab(tab, subTab = null) {
      emit('update-tab', { tab, subTab });
    }

    return {
      updateActiveTab,
    };
  },
  template: `
    <div class="h-full p-4">
      <viewer-goals v-if="activeTab === 'Goals'" />
      <viewer-documents v-if="activeTab === 'Documents' && activeDocumentSubTab === 'Viewer'" />
      <viewer-clips v-if="activeTab === 'Documents' && activeDocumentSubTab === 'Clips'" />
      <viewer-transcribe v-if="activeTab === 'Transcriptions'" />
      <viewer-questions v-if="activeTab === 'Q&A'" />
      <viewer-artifacts v-if="activeTab === 'Artifacts'" />
      <uploads v-if="activeTab === 'Documents' && activeDocumentSubTab === 'Uploads'" />
    </div>
  `,
};