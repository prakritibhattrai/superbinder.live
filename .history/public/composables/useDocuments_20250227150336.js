// composables/useDocuments.js
import { useRealTime } from './useRealTime.js';
import { processFile } from '../utils/files/fileProcessor.js';
import { useHistory } from './useHistory.js';

const documents = Vue.ref([]);
const selectedDocument = Vue.ref(null);
const { emit, on, off } = useRealTime();
const clippedContent = Vue.ref('');
const { gatherLocalHistory, saveToLocalHistory } = useHistory();

const eventHandlers = new WeakMap();

export function useDocuments() {
  function handleAddDocument({ document }) {
    console.log('Handling add-document:', document);
    if (!documents.value.some(d => d.id === document.id)) {
      documents.value = [...documents.value, document];
    }
  }

  function handleRemoveDocument({ id }) { // Changed from documentId to id
    console.log('Handling remove-document:', id);
    documents.value = documents.value.filter(d => d.id !== id);
    if (selectedDocument.value && selectedDocument.value.id === id) {
      selectedDocument.value = null;
    }
  }

  function handleRenameDocument({ id, name }) { // Changed from documentId to id
    console.log('Handling rename-document:', { id, name });
    const doc = documents.value.find(d => d.id === id);
    if (doc) {
      doc.name = name.trim();
      if (selectedDocument.value && selectedDocument.value.id === id) {
        selectedDocument.value.name = name.trim();
      }
    }
  }

  function handleSnapshot(history) {
    console.log('Handling history snapshot for documents:', history.documents);
    documents.value = (history.documents || []).sort((a, b) => a.timestamp - b.timestamp);
  }

  const addDocumentHandler = on('add-document', handleAddDocument);
  const removeDocumentHandler = on('remove-document', handleRemoveDocument);
  const renameDocumentHandler = on('rename-document', handleRenameDocument);
  const snapshotHandler = on('history-snapshot', handleSnapshot);

  eventHandlers.set(useDocuments, {
    addDocument: addDocumentHandler,
    removeDocument: removeDocumentHandler,
    renameDocument: renameDocumentHandler,
    snapshot: snapshotHandler,
  });

  async function addDocument(file) {
    console.log('Adding document from file:', file.name);
    const doc = await processFile(file);
    if (doc.status === 'complete') {
      const documentWithMetadata = {
        id: doc.id,
        name: doc.name,
        createdBy: useRealTime().displayName.value,
        timestamp: Date.now(),
        processedContent: doc.processedContent,
        content: doc.content || doc.processedContent, // Make sure content is available
      };
      documents.value = [...documents.value, documentWithMetadata];
      emit('add-document', { document: documentWithMetadata });
    } else if (doc.status === 'error') {
      console.error(`Failed to process file ${file.name}:`, doc);
    }
    return doc;
  }

  // Add saveDocument function that was missing
  function saveDocument(doc) {
    console.log('Saving document:', doc.name);
    
    // Check if document with same ID already exists
    const existingIndex = documents.value.findIndex(d => d.id === doc.id);
    if (existingIndex !== -1) {
      // Update existing document
      documents.value[existingIndex] = doc;
      console.log(`Updated existing document: ${doc.name} (${doc.id})`);
    } else {
      // Add new document
      documents.value.push(doc);
      console.log(`Added new document: ${doc.name} (${doc.id})`);
    }
    
    // Save to local history
    saveToLocalHistory({ documents: documents.value });
    
    // Emit event
    emit('document-saved', { document: doc });
    
    return doc;
  }

  function removeDocument(id) { // Changed from documentId to id
    console.log('Removing document:', id);
    documents.value = documents.value.filter(doc => doc.id !== id);
    emit('document-removed', { id }); // Changed from documentId to id
    if (selectedDocument.value && selectedDocument.value.id === id) {
      selectedDocument.value = null;
    }
  }

  function updateDocument(id, name) { // Changed from documentId to id
    console.log(`Updating document ${id} with name: ${name}`);
    const doc = documents.value.find(d => d.id === id);
    if (doc) {
      doc.name = name.trim();
      if (selectedDocument.value && selectedDocument.value.id === id) {
        selectedDocument.value.name = name.trim();
      }
      emit('document-updated', { document: { ...doc, updatedAt: Date.now() } });
    } else {
      console.error(`Document with ID ${id} not found for update`);
    }
  }

  function setSelectedDocument(doc) {
    console.log('Setting selected document:', doc?.name);
    selectedDocument.value = doc;
    emit('document-selected', { document: doc });
  }

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

  // Load documents from local history
  function loadDocuments() {
    const history = gatherLocalHistory();
    if (history.documents && history.documents.length > 0) {
      documents.value = history.documents;
      console.log(`Loaded ${documents.value.length} documents from history`);
    } else {
      documents.value = [];
      console.log('No documents found in history');
    }
  }

  // Load documents on setup
  loadDocuments();

  // Listen for events
  on('document-saved', () => loadDocuments());
  on('document-removed', () => loadDocuments());
  on('document-updated', () => loadDocuments());
  on('state-synced', () => loadDocuments());

  return {
    documents,
    selectedDocument,
    clippedContent,
    addDocument,
    removeDocument,
    updateDocument,
    setSelectedDocument,
    saveDocument,
    cleanup,
  };
}