import axios from 'axios';

const API_URL = 'http://localhost:8000/api/grading';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const gradingService = {
    async getPendingSubmissions() {
        const response = await axios.get(`${API_URL}/pending`, getAuthHeader());
        return response.data;
    },

    async getHistory() {
        const response = await axios.get(`${API_URL}/history`, getAuthHeader());
        return response.data;
    },

    async analyzeSubmission(taskId, studentId) {
        const response = await axios.post(`${API_URL}/analyze-submission`, {
            task_id: taskId,
            student_id: studentId
        }, getAuthHeader());
        return response.data;
    },

    async finalizeGrade(suggestionId, data) {
        const response = await axios.put(`${API_URL}/${suggestionId}/finalize`, data, getAuthHeader());
        return response.data;
    }
};
