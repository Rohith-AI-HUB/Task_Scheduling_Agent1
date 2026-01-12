import axios from 'axios';

const API_URL = 'http://localhost:8000/api/stress';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const stressService = {
    async getCurrentStress() {
        const response = await axios.get(`${API_URL}/current`, getAuthHeader());
        return response.data;
    },

    async getStressAnalysis() {
        const response = await axios.get(`${API_URL}/analysis`, getAuthHeader());
        return response.data;
    },

    async recordStress(score, factors = []) {
        const response = await axios.post(`${API_URL}/record`, { score, factors }, getAuthHeader());
        return response.data;
    }
};
