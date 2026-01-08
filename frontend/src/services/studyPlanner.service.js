import axios from 'axios';

const API_URL = 'http://localhost:8000/api/study-planner';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const studyPlannerService = {
  // Preferences
  async getPreferences() {
    const response = await axios.get(`${API_URL}/preferences`, getAuthHeader());
    return response.data;
  },

  async updatePreferences(preferences) {
    const response = await axios.put(`${API_URL}/preferences`, preferences, getAuthHeader());
    return response.data;
  },

  // Schedule Generation
  async generateSchedule(targetDate = null, regenerate = false) {
    const params = new URLSearchParams();
    if (targetDate) params.append('target_date', targetDate);
    if (regenerate) params.append('regenerate', 'true');

    const response = await axios.post(
      `${API_URL}/generate?${params.toString()}`,
      {},
      getAuthHeader()
    );
    return response.data;
  },

  async generateWeekSchedule(startDate = null) {
    const params = startDate ? `?start_date=${startDate}` : '';
    const response = await axios.post(
      `${API_URL}/generate-week${params}`,
      {},
      getAuthHeader()
    );
    return response.data;
  },

  // Schedule Retrieval
  async getSchedule(date) {
    const response = await axios.get(`${API_URL}/schedule/${date}`, getAuthHeader());
    return response.data;
  },

  async getSchedulesRange(startDate, endDate) {
    const response = await axios.get(
      `${API_URL}/schedules?start_date=${startDate}&end_date=${endDate}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Block Operations
  async completeBlock(date, blockId) {
    const response = await axios.post(
      `${API_URL}/schedule/${date}/blocks/${blockId}/complete`,
      {},
      getAuthHeader()
    );
    return response.data;
  },

  async updateBlock(date, blockId, updates) {
    const response = await axios.put(
      `${API_URL}/schedule/${date}/blocks/${blockId}`,
      updates,
      getAuthHeader()
    );
    return response.data;
  },

  async removeBlock(date, blockId) {
    const response = await axios.delete(
      `${API_URL}/schedule/${date}/blocks/${blockId}`,
      getAuthHeader()
    );
    return response.data;
  },

  async addBlock(date, block) {
    const response = await axios.post(
      `${API_URL}/schedule/${date}/blocks`,
      block,
      getAuthHeader()
    );
    return response.data;
  },

  // Quick Actions
  async quickReschedule(taskId, reason) {
    const response = await axios.post(
      `${API_URL}/quick-reschedule`,
      { task_id: taskId, reason },
      getAuthHeader()
    );
    return response.data;
  },

  // Stats
  async getStats(days = 7) {
    const response = await axios.get(`${API_URL}/stats?days=${days}`, getAuthHeader());
    return response.data;
  }
};
