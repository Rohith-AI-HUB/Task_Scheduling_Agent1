import axios from 'axios';

const API_URL = 'http://localhost:8000/api/groups';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const groupService = {
    async getGroups() {
        const response = await axios.get(`${API_URL}/`, getAuthHeader());
        return response.data;
    },

    async getMyGroups() {
        const response = await axios.get(`${API_URL}/my-groups/all`, getAuthHeader());
        return response.data;
    },

    async createGroup(data) {
        const response = await axios.post(`${API_URL}/`, data, getAuthHeader());
        return response.data;
    },

    async deleteGroup(groupId) {
        const response = await axios.delete(`${API_URL}/${groupId}`, getAuthHeader());
        return response.data;
    },

    async assignTask(groupId, taskId) {
        const response = await axios.post(`${API_URL}/${groupId}/assign-task`, { task_id: taskId }, getAuthHeader());
        return response.data;
    }
};
