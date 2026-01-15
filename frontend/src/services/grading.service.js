import axios from 'axios';

const API_URL = 'http://localhost:8000/api/grading';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const gradingService = {
    /**
     * Get all tasks assigned by this teacher with student details
     * @param {Object} filters - Optional filters (status, subject, search)
     */
    async getAssignedTasks(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.subject) params.append('subject', filters.subject);
        if (filters.search) params.append('search', filters.search);

        const queryString = params.toString();
        const url = queryString ? `${API_URL}/assigned-tasks?${queryString}` : `${API_URL}/assigned-tasks`;

        const response = await axios.get(url, getAuthHeader());
        return response.data;
    },

    /**
     * Get full task details including attachments and notes
     * @param {string} taskId - Task ID
     */
    async getTaskDetails(taskId) {
        const response = await axios.get(`${API_URL}/task/${taskId}/details`, getAuthHeader());
        return response.data;
    },

    /**
     * Add teacher feedback and optional grade to a task
     * @param {string} taskId - Task ID
     * @param {Object} data - Feedback data { feedback: string, grade?: number }
     */
    async addFeedback(taskId, data) {
        const response = await axios.post(`${API_URL}/task/${taskId}/feedback`, data, getAuthHeader());
        return response.data;
    },

    /**
     * Get statistics for the task review dashboard
     */
    async getStats() {
        const response = await axios.get(`${API_URL}/stats`, getAuthHeader());
        return response.data;
    }
};
