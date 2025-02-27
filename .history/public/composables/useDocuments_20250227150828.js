// composables/useDocuments.js
import { useRealTime } from './useRealTime.js';
import { processFile } from '../utils/files/fileProcessor.js';

const documents = Vue.ref([]);
const selectedDocument = Vue.ref(null);
const { emit, on, off } = useRealTime();

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
    // Make sure we're not adding a duplicate
    if (!documents.value.some(d => d.id === doc.id)) {
      documents.value = [...documents.value, doc];
      emit('add-document', { document: doc });
      console.log('Document saved:', doc);
    } else {
      console.warn('Document with ID already exists:', doc.id);
    }
    return doc;
  }

  function removeDocument(id) { // Changed from documentId to id
    documents.value = documents.value.filter(doc => doc.id !== id);
    emit('remove-document', { id }); // Changed from documentId to id
    if (selectedDocument.value && selectedDocument.value.id === id) {
      selectedDocument.value = null;
    }
  }

  function updateDocument(id, name) { // Changed from documentId to id
    const doc = documents.value.find(d => d.id === id);
    if (doc) {
      doc.name = name.trim();
      if (selectedDocument.value && selectedDocument.value.id === id) {
        selectedDocument.value.name = name.trim();
      }
      emit('rename-document', { id, name: name.trim() }); // Changed from documentId to id
    }
  }

  function setSelectedDocument(doc) {
    selectedDocument.value = doc;
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

  return {
    documents,
    selectedDocument,
    addDocument,
    removeDocument,
    updateDocument,
    setSelectedDocument,
    saveDocument, // Export the saveDocument function
    cleanup,
  };
}