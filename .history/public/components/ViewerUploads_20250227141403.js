// components/ViewerUploads.js
import { useDocuments } from '../composables/useDocuments.js';
import { useRealTime } from '../composables/useRealTime.js';

export default {
  name: 'ViewerUploads',
  props: {
    updateTab: {
      type: Function,
      required: true,
    },
  },
  template: `
    <div class="h-full overflow-y-auto p-2">
      <h3 class="text-lg font-semibold text-purple-400 mb-4">Uploads</h3>
      
      <!-- Drag and Drop Area with Upload Button -->
      <div 
        ref="dropZone" 
        class="border-2 border-dashed border-gray-600 p-4 mb-4 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer text-gray-300"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        @click="triggerFileUpload"  
      >
        <div class="flex items-center justify-center space-x-2">
          <i class="pi pi-file-plus text-xl"></i>
          <span>Drag and drop files here, or click to upload</span>
        </div>
        <input 
          type="file" 
          ref="fileInput" 
          class="hidden" 
          @change="handleFileUpload" 
          accept=".docx,.pdf,.pptx,.html,.txt,.js,.json,.css,.md,.xlsx"
          multiple
        />
      </div>

      <!-- Document List -->
      <div v-if="documents.length" class="space-y-2">
        <div 
          v-for="doc in documents" 
          :key="doc.id" 
          class="flex items-center justify-between p-2 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer w-full overflow-x-hidden"
          @click="selectDocument(doc, $event)"
        >
          <div class="flex items-center space-x-2 flex-1 min-w-0">
            <i :class="getFileIcon(doc.name)"></i>
            <span v-if="!editingDocId || editingDocId !== doc.id" class="text-white truncate flex-1 min-w-0">
              {{ doc.name }}
            </span>
            <input
              v-else
              v-model="editName"
              @keypress.enter="finishEditing(doc.id)"
              @blur="finishEditing(doc.id)"
              class="bg-transparent text-white border-b border-gray-500 focus:border-purple-400 outline-none flex-1 min-w-0"
              placeholder="Rename document"
              ref="editInput"
            />
            <button 
              v-if="!editingDocId || editingDocId !== doc.id" 
              @click.stop="startEditing(doc)" 
              class="text-gray-400 hover:text-purple-400 ml-2 flex-shrink-0"
            >
              <i class="pi pi-pencil"></i>
            </button>
          </div>
          <button @click.stop="removeDocumentLocal(doc.id)" class="text-red-400 hover:text-red-300 flex-shrink-0">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>
      <div v-else class="text-gray-400 text-center">No documents yet.</div>
    </div>
  `,
  setup(props) {
    const { documents, addDocument, removeDocument, setSelectedDocument, updateDocument } = useDocuments();
    const { emit } = useRealTime();
    const dropZone = Vue.ref(null);
    const fileInput = Vue.ref(null);
    const editingDocId = Vue.ref(null);
    const editName = Vue.ref('');
    const editInput = Vue.ref(null);

    function onDragOver(event) {
      event.preventDefault();
      dropZone.value.classList.add('border-purple-400', 'bg-gray-600');
    }

    function onDragLeave(event) {
      event.preventDefault();
      dropZone.value.classList.remove('border-purple-400', 'bg-gray-600');
    }

    async function onDrop(event) {
      event.preventDefault();
      dropZone.value.classList.remove('border-purple-400', 'bg-gray-600');
      const files = event.dataTransfer.files;
      await handleFiles(files);
    }

    async function handleFileUpload(event) {
      const files = event.target.files;
      await handleFiles(files);
      fileInput.value.value = '';
    }

    function triggerFileUpload() {
      fileInput.value.click();
    }

    async function handleFiles(files) {
      for (const file of Array.from(files)) {
        await addDocument(file);
      }
    }

    function selectDocument(doc, event) {
      if (!event.target.closest('.pi-pencil') && !event.target.closest('.pi-times') && !editingDocId.value) {
        setSelectedDocument(doc);
        console.log('ViewerUploads calling updateTab:', { tab: 'Documents', subTab: 'Viewer' });
        props.updateTab('Documents', 'Viewer'); // Directly update tab
        emit('update-tab', { tab: 'Documents', subTab: 'Viewer' }); // Still emit for other clients
      }
    }

    function startEditing(doc) {
      editingDocId.value = doc.id;
      editName.value = doc.name;
      Vue.nextTick(() => {
        if (editInput.value && editInput.value[0]) {
          editInput.value[0].focus();
        }
      });
    }

    function finishEditing(docId) {
      if (editName.value.trim()) {
        updateDocument(docId, editName.value.trim());
      }
      editingDocId.value = null;
      editName.value = '';
    }

    function removeDocumentLocal(id) {
      removeDocument(id);
      if (editingDocId.value === id) {
        editingDocId.value = null;
      }
    }

    function getFileIcon(fileName) {
      const extension = fileName.includes('.') 
        ? fileName.split('.').pop().toLowerCase() 
        : 'default';
      const iconMap = {
        js: 'pi pi-code',
        jsx: 'pi pi-code',
        ts: 'pi pi-code',
        tsx: 'pi pi-code',
        html: 'pi pi-code',
        css: 'pi pi-palette',
        scss: 'pi pi-palette',
        json: 'pi pi-database',
        xml: 'pi pi-database',
        csv: 'pi pi-table',
        md: 'pi pi-file-edit',
        txt: 'pi pi-file-edit',
        doc: 'pi pi-file-word',
        docx: 'pi pi-file-word',
        pdf: 'pi pi-file-pdf',
        png: 'pi pi-image',
        jpg: 'pi pi-image',
        jpeg: 'pi pi-image',
        gif: 'pi pi-image',
        svg: 'pi pi-image',
        yml: 'pi pi-cog',
        yaml: 'pi pi-cog',
        config: 'pi pi-cog',
        env: 'pi pi-cog',
        gitignore: 'pi pi-github',
        lock: 'pi pi-lock',
        xlsx: 'pi pi-file-excel',
        default: 'pi pi-file',
      };
      return iconMap[extension] || iconMap.default;
    }

    return {
      documents,
      dropZone,
      fileInput,
      editingDocId,
      editName,
      editInput,
      onDragOver,
      onDragLeave,
      onDrop,
      handleFileUpload,
      triggerFileUpload,
      selectDocument,
      startEditing,
      finishEditing,
      removeDocumentLocal,
      getFileIcon,
    };
  },
};