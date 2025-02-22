// components/ViewerFull.js
import { useDocuments } from '../composables/useDocuments.js';
import { useClips } from '../composables/useClips.js';
import { useSearch } from '../composables/useSearch.js';

export default {
  name: 'ViewerFull',
  template: `
    <div class="h-full flex flex-col overflow-hidden">
      <!-- Search Bar -->
      <div class="p-2 bg-gray-800 border-b border-gray-700">
        <input
          v-model="searchQuery"
          @input="performSearch"
          type="text"
          class="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          placeholder="Search documents (e.g., 'weather forecast Maine')..."
        />
      </div>

      <!-- Document and Search Results -->
      <div class="flex-1 overflow-auto p-4">
        <!-- Document Selection -->
        <select
          v-model="selectedDocId"
          @change="scrollToTop"
          class="w-full p-2 mb-4 bg-gray-700 text-white rounded-lg border border-gray-600"
        >
          <option value="">Select a document</option>
          <option v-for="doc in documents" :key="doc.id" :value="doc.id">
            {{ doc.name }}
          </option>
        </select>

        <!-- Full Document View -->
        <div v-if="selectedDoc && !searchResults.length" class="bg-gray-700 p-4 rounded-lg">
          <div ref="docContent" v-html="renderContent(selectedDoc.content)" class="prose text-gray-300"></div>
          <button
            v-if="selectedText"
            @click="clipSelectedText"
            class="mt-2 py-1 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Clip Selected
          </button>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length" class="space-y-4">
          <div v-for="(result, index) in searchResults" :key="index" class="bg-gray-700 p-4 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">{{ result.documentName }}</span>
              <button
                @click="toggleExpand(index)"
                class="text-purple-400 hover:text-purple-300"
              >
                {{ expanded[index] ? 'Collapse' : 'Expand' }}
              </button>
            </div>
            <div v-if="expanded[index]" class="mt-2">
              <div v-html="highlightMatch(result.segment)" class="text-gray-300"></div>
              <div class="flex gap-2 mt-2">
                <button
                  @click="viewFullDoc(result.documentId, result.segment)"
                  class="py-1 px-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                >
                  View Full
                </button>
                <button
                  @click="addClip(result.segment, result.documentId)"
                  class="py-1 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center"
                >
                  <i class="pi pi-cut mr-2"></i> Clip
                </button>
              </div>
            </div>
            <div v-else class="text-gray-300 truncate">{{ result.segment.substring(0, 100) }}...</div>
          </div>
        </div>

        <div v-if="!selectedDocId && !searchResults.length" class="text-gray-400">
          Select a document or search to begin.
        </div>
      </div>
    </div>
  `,
  setup() {
    const { documents } = useDocuments();
    const { addClip } = useClips();
    const { searchQuery, searchResults, searchDocuments } = useSearch();
    const selectedDocId = Vue.ref('');
    const selectedText = Vue.ref('');
    const expanded = Vue.ref({});
    const docContent = Vue.ref(null);

    // Computed selected document
    const selectedDoc = Vue.computed(() => documents.value.find(doc => doc.id === selectedDocId.value));

    // Advanced keyword matching
    function performSearch() {
      if (searchQuery.value.trim()) {
        searchDocuments(searchQuery.value);
      } else {
        searchResults.value = [];
      }
    }

    // Highlight matched keywords
    function highlightMatch(text) {
      const keywords = searchQuery.value.toLowerCase().split(/\s+/).filter(k => k);
      let highlighted = text;
      keywords.forEach(keyword => {
        const regex = new RegExp(`(${keyword})`, 'gi');
        highlighted = highlighted.replace(regex, '<span class="bg-purple-500 text-white px-1">$1</span>');
      });
      return highlighted;
    }

    // Render document content (preserve HTML if present)
    function renderContent(content) {
      return content.includes('<') ? content : `<p>${content}</p>`;
    }

    // Toggle search result expansion
    function toggleExpand(index) {
      Vue.set(expanded.value, index, !expanded.value[index]);
    }

    // View full document and scroll to match
    function viewFullDoc(docId, segment) {
      selectedDocId.value = docId;
      Vue.nextTick(() => {
        const contentEl = docContent.value;
        const matchIndex = selectedDoc.value.content.indexOf(segment);
        if (matchIndex >= 0) {
          contentEl.scrollTop = matchIndex / selectedDoc.value.content.length * contentEl.scrollHeight;
        }
      });
    }

    // Add clip from search result
    // function addClip(segment, docId) {
    //   addClip(segment, docId);
    // }

    // Clip selected text from full document
    function clipSelectedText() {
      if (selectedText.value && selectedDocId.value) {
        addClip(selectedText.value, selectedDocId.value);
        selectedText.value = '';
      }
    }

    // Capture selected text
    Vue.onMounted(() => {
      document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (selection.rangeCount && docContent.value.contains(selection.anchorNode)) {
          selectedText.value = selection.toString().trim();
        } else {
          selectedText.value = '';
        }
      });
    });

    function scrollToTop() {
      if (docContent.value) docContent.value.scrollTop = 0;
    }

    return {
      documents,
      selectedDocId,
      selectedDoc,
      searchQuery,
      searchResults,
      expanded,
      docContent,
      selectedText,
      performSearch,
      highlightMatch,
      renderContent,
      toggleExpand,
      viewFullDoc,
      addClip,
      clipSelectedText,
      scrollToTop,
    };
  },
};