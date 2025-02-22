// composables/useDocuments.js
import { useRealTime } from './useRealTime.js';

const documents = Vue.ref([]);
const { emit, on } = useRealTime();

export function useDocuments() {
  on('add-document', (doc) => {
    if (!documents.value.some(d => d.id === doc.id)) {
      documents.value.push(doc);
    }
  });
  on('remove-document', (id) => {
    documents.value = documents.value.filter(d => d.id !== id);
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