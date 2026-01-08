import axios from 'axios';

const API_URL = 'http://localhost:8000/api/calendar';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const calendarService = {
  // OAuth Flow
  async initiateOAuth() {
    const response = await axios.post(`${API_URL}/oauth/initiate`, {}, getAuthHeader());
    return response.data;
  },

  async disconnect() {
    const response = await axios.post(`${API_URL}/oauth/disconnect`, {}, getAuthHeader());
    return response.data;
  },

  // Sync Status & Preferences
  async getStatus() {
    const response = await axios.get(`${API_URL}/status`, getAuthHeader());
    return response.data;
  },

  async updatePreferences(preferences) {
    const response = await axios.put(`${API_URL}/preferences`, preferences, getAuthHeader());
    return response.data;
  },

  // Manual Sync Operations
  async syncTask(taskId) {
    const response = await axios.post(`${API_URL}/sync/task/${taskId}`, {}, getAuthHeader());
    return response.data;
  },

  async syncSchedule(date) {
    const response = await axios.post(`${API_URL}/sync/schedule/${date}`, {}, getAuthHeader());
    return response.data;
  },

  async triggerFullSync() {
    const response = await axios.post(`${API_URL}/sync/full`, {}, getAuthHeader());
    return response.data;
  },

  // Conflict Management
  async getConflicts() {
    const response = await axios.get(`${API_URL}/conflicts`, getAuthHeader());
    return response.data;
  },

  async resolveConflict(mappingId, resolution) {
    const response = await axios.post(
      `${API_URL}/conflicts/${mappingId}/resolve`,
      { resolution },
      getAuthHeader()
    );
    return response.data;
  },

  // Event Operations
  async listEvents() {
    const response = await axios.get(`${API_URL}/events`, getAuthHeader());
    return response.data;
  },

  async deleteEvent(eventId) {
    const response = await axios.delete(`${API_URL}/events/${eventId}`, getAuthHeader());
    return response.data;
  }
};
