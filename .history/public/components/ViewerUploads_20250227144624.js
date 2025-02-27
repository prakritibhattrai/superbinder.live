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
    <div class="h-full p-4 overflow-y-auto">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold mb-4 text-green-400">Uploads</h2>
        <div class="space-x-2">
          <button @click="loadSampleDocuments" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm">
            Load Sample Docs
          </button>
          <button @click="openFileInput" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
            Upload Files
          </button>
        </div>
      </div>
      <input 
        ref="fileInput" 
        type="file" 
        @change="handleFileUpload" 
        class="hidden" 
        multiple
      />
      
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
    const { documents, addDocument, removeDocument, setSelectedDocument, updateDocument, saveDocument } = useDocuments();
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

    // Function to create a new document
    function createDocument(id, name, content, type = 'text') {
      const timestamp = Date.now();
      return {
        id: id || `doc_${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
        name,
        content,
        type,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
      };
    }
    
    // Function to load sample documents
    async function loadSampleDocuments() {
      const sampleFiles = [
        'climate_change.txt',
        'city_of_edmonton.txt',
        'artificial_intelligence.txt',
        'unemployment.txt'
      ];
      
      for (const filename of sampleFiles) {
        try {
          const response = await fetch(`/sample_docs/${filename}`);
          if (!response.ok) {
            console.error(`Failed to load ${filename}: ${response.statusText}`);
            continue;
          }
          
          const content = await response.text();
          const doc = createDocument(
            `sample_${filename}`, 
            filename.replace('.txt', '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '), 
            content, 
            'text'
          );
          
          saveDocument(doc);
        } catch (error) {
          console.error(`Error loading ${filename}:`, error);
        }
      }
      
      alert("Sample documents loaded successfully!");
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
      loadSampleDocuments
    };
  },
};