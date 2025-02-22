// components/DocumentSidebar.vue
import { useDocuments } from '../composables/useDocuments.js';

export default {
  name: 'DocumentSidebar',
  template: `
    <div class="h-full p-4 overflow-auto">
      <h3 class="text-lg font-semibold text-purple-400 mb-4">Documents</h3>
      <button
        @click="addDocumentLocal"
        class="w-full py-2 mb-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
      >
        Add Document
      </button>
      <div v-if="documents.length === 0" class="text-gray-400">No documents yet.</div>
      <div v-else>
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="p-2 mb-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
        >
          {{ doc.name }}
        </div>
      </div>
    </div>
  `,
  setup() {
    const { documents, addDocument } = useDocuments();

    // Stub for adding a document (to be expanded with file upload)
    function addDocumentLocal() {
      const mockFile = {
        name: `Document_${Date.now()}`,
        type: 'text/plain',
        content: 'Sample content',
      };
      addDocument(mockFile);
    }

    return {
      documents,
      addDocumentLocal,
    };
  },
};