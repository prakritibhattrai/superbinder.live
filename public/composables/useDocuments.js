// composables/useDocuments.js
import { useRealTime } from './useRealTime.js';
import { processFile } from '../utils/files/fileProcessor.js'; // Ensure correct path

const documents = Vue.ref([]);
const selectedDocument = Vue.ref(null); // New ref for selected document
const { emit, on, off } = useRealTime();

export function useDocuments() {
  function handleAddDocument(doc) {
    if (!documents.value.some(d => d.id === doc.id)) {
      // Preserve upload order by pushing to the end
      documents.value.push(doc);
    }
  }

  function handleRemoveDocument({ documentId }) {
    documents.value = documents.value.filter(d => d.id !== documentId);
    if (selectedDocument.value && selectedDocument.value.id === documentId) {
      selectedDocument.value = null; // Clear selection if removed document was selected
    }
  }

  function handleRenameDocument({ documentId, newName }) {
    const doc = documents.value.find(d => d.id === documentId);
    if (doc) {
      doc.name = newName.trim();
      if (selectedDocument.value && selectedDocument.value.id === documentId) {
        selectedDocument.value.name = newName.trim(); // Update selected document name
      }
    }
  }

  function handleSnapshot(history) {
    documents.value = (history.documents || []).sort((a, b) => a.timestamp - b.timestamp); // Maintain order by timestamp
  }

  on('add-document', handleAddDocument);
  on('remove-document', handleRemoveDocument);
  on('rename-document', handleRenameDocument);
  on('history-snapshot', handleSnapshot);

  Vue.onUnmounted(() => {
    off('add-document', handleAddDocument);
    off('remove-document', handleRemoveDocument);
    off('rename-document', handleRenameDocument);
    off('history-snapshot', handleSnapshot);
  });

  // Centralized file processing and addition
  async function addDocument(file) {
    const doc = await processFile(file);
    if (doc.status === 'complete') {
      documents.value.push(doc);
      emit('add-document', { document: doc }); // Sync with other users
    } else if (doc.status === 'error') {
      console.error(`Failed to process file ${file.name}:`, doc);
    }
    return doc; // Return doc for potential use in components
  }

  function removeDocument(docId) {
    documents.value = documents.value.filter(doc => doc.id !== docId);
    emit('remove-document', { documentId: docId });
    if (selectedDocument.value && selectedDocument.value.id === docId) {
      selectedDocument.value = null; // Clear selection if removed
    }
  }

  // Set selected document
  function setSelectedDocument(doc) {
    selectedDocument.value = doc;
  }

  return { documents, selectedDocument, addDocument, removeDocument, setSelectedDocument };
}