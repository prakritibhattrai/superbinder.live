// composables/useDocuments.js
import { useRealTime } from './useRealTime.js';
import { processFile } from '../utils/files/fileProcessor.js'; // Ensure correct path

const documents = Vue.ref([]);
const selectedDocument = Vue.ref(null); // New ref for selected document
const { emit, on, off } = useRealTime();

// Store event handlers for cleanup
const eventHandlers = new WeakMap();

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

  // Register event listeners and store handlers for cleanup
  const addDocumentHandler = on('add-document', handleAddDocument);
  const removeDocumentHandler = on('remove-document', handleRemoveDocument);
  const renameDocumentHandler = on('rename-document', handleRenameDocument);
  const snapshotHandler = on('history-snapshot', handleSnapshot);

  // Store handlers in a WeakMap for cleanup
  eventHandlers.set(useDocuments, {
    addDocument: addDocumentHandler,
    removeDocument: removeDocumentHandler,
    renameDocument: renameDocumentHandler,
    snapshot: snapshotHandler,
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

  // Cleanup function for components to call
  function cleanup() {
    const handlers = eventHandlers.get(useDocuments);
    if (handlers) {
      off('add-document', handlers.addDocument);
      off('remove-document', handlers.removeDocument);
      off('rename-document', handlers.renameDocument);
      off('history-snapshot', handlers.snapshot);
      eventHandlers.delete(useDocuments);
    }
  }

  return { documents, selectedDocument, addDocument, removeDocument, setSelectedDocument, cleanup };
}