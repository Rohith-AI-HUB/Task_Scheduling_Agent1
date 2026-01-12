import axios from 'axios';

const API_URL = 'http://localhost:8000/api/analytics';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const analyticsService = {
    async getDashboardStats() {
        const response = await axios.get(`${API_URL}/dashboard`, getAuthHeader());
        return response.data;
    },

    async getWorkload() {
        const response = await axios.get(`${API_URL}/workload`, getAuthHeader());
        return response.data;
    },

    async getProductivityMetrics() {
        const response = await axios.get(`${API_URL}/productivity-metrics`, getAuthHeader());
        return response.data;
    }
};
