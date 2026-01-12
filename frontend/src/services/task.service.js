import axios from 'axios';

const API_URL = 'http://localhost:8000/api/tasks';

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const taskService = {
  async getTasks() {
    const response = await axios.get(API_URL, getAuthHeader());
    return response.data;
  },

  async createTask(taskData) {
    const response = await axios.post(API_URL, taskData, getAuthHeader());
    return response.data;
  },

  async updateTask(taskId, updates) {
    const response = await axios.put(`${API_URL}/${taskId}`, updates, getAuthHeader());
    return response.data;
  },

  async deleteTask(taskId) {
    const response = await axios.delete(`${API_URL}/${taskId}`, getAuthHeader());
    return response.data;
  }
};
