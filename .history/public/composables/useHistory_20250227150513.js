// composables/useHistory.js
import { useRealTime } from './useRealTime.js';

const { emit } = useRealTime();
const localStorageKey = 'superbinder-history';

export function useHistory() {
  // Gather history directly from localStorage without calling useDocuments
  function gatherLocalHistory() {
    try {
      const historyString = localStorage.getItem(localStorageKey);
      if (!historyString) {
        return { documents: [], clips: [], events: [] };
      }
      
      const parsedHistory = JSON.parse(historyString);
      return {
        documents: parsedHistory.documents || [],
        clips: parsedHistory.clips || [],
        events: parsedHistory.events || [],
        ...parsedHistory
      };
    } catch (error) {
      console.error('Error gathering local history:', error);
      return { documents: [], clips: [], events: [] };
    }
  }

  function saveToLocalHistory(partialHistory) {
    try {
      const currentHistory = gatherLocalHistory();
      const updatedHistory = {
        ...currentHistory,
        ...partialHistory,
      };
      
      localStorage.setItem(localStorageKey, JSON.stringify(updatedHistory));
      emit('history-updated', updatedHistory);
      return updatedHistory;
    } catch (error) {
      console.error('Error saving to local history:', error);
      return null;
    }
  }

  function clearLocalHistory() {
    localStorage.removeItem(localStorageKey);
    emit('history-cleared');
  }

  return {
    gatherLocalHistory,
    saveToLocalHistory,
    clearLocalHistory,
  };
}