import axios from 'axios';

const API_URL = 'http://localhost:8000/api/bulk-tasks';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const bulkTaskService = {
    async getStudents() {
        const response = await axios.get(`${API_URL}/students`, getAuthHeader());
        return response.data;
    },

    async getTemplates() {
        const response = await axios.get(`${API_URL}/templates`, getAuthHeader());
        return response.data;
    },

    async createBulkTasks(data) {
        const response = await axios.post(`${API_URL}/create`, data, getAuthHeader());
        return response.data;
    },

    async saveTemplate(data) {
        const response = await axios.post(`${API_URL}/templates`, data, getAuthHeader());
        return response.data;
    }
};
