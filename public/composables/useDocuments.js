import { useRealTime } from './useRealTime.js';

const documents = Vue.ref([]);
const { emit, on, off } = useRealTime();

export function useDocuments() {
  function handleAddDocument(doc) {
    if (!documents.value.some(d => d.id === doc.id)) documents.value.push(doc);
  }
  function handleRemoveDocument(id) {
    documents.value = documents.value.filter(d => d.id !== id);
  }
  function handleSnapshot(history) {
    documents.value = history.documents || [];
  }

  on('add-document', handleAddDocument);
  on('remove-document', handleRemoveDocument);
  on('history-snapshot', handleSnapshot);

  Vue.onUnmounted(() => {
    off('add-document', handleAddDocument);
    off('remove-document', handleRemoveDocument);
    off('history-snapshot', handleSnapshot);
  });

  function addDocument(file) {
    const doc = { id: uuidv4(), name: file.name, type: file.type, content: file.content, timestamp: Date.now() };
    documents.value.push(doc);
    emit('add-document', { document: doc });
  }

  function removeDocument(id) {
    documents.value = documents.value.filter(doc => doc.id !== id);
    emit('remove-document', { documentId: id });
  }

  return { documents, addDocument, removeDocument };
}