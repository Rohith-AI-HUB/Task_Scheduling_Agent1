import axios from 'axios';

const API_URL = 'http://localhost:8000/api/class';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const classService = {
    async getClassAnalytics() {
        const response = await axios.get(`${API_URL}/analytics`, getAuthHeader());
        return response.data;
    },

    async getStudentDetail(studentId) {
        const response = await axios.get(`${API_URL}/student/${studentId}`, getAuthHeader());
        return response.data;
    }
};
