// components/Viewer.vue
import ViewerFull from './ViewerFull.js';
import ViewerClips from './ViewerClips.js';
import ViewerTranscribe from './ViewerTranscribe.js';
import ViewerSynthesize from './ViewerSynthesize.js';

export default {
  name: 'Viewer',
  components: {
    ViewerFull,
    ViewerClips,
    ViewerTranscribe,
    ViewerSynthesize,
  },
  props: {
    activeTab: {
      type: String,
      required: true,
    },
  },
  template: `
    <div class="h-full p-4">
      <viewer-full v-if="activeTab === 'Full'" />
      <viewer-clips v-if="activeTab === 'Clips'" />
      <viewer-transcribe v-if="activeTab === 'Transcribe'" />
      <viewer-synthesize v-if="activeTab === 'Synthesize'" />
    </div>
  `,
};