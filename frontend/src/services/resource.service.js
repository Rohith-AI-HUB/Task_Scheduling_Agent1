import axios from 'axios';

const API_URL = 'http://localhost:8000/api/resources';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const resourceService = {
    async getResources(filter = 'all') {
        const params = filter !== 'all' ? `?type_filter=${filter}` : '';
        const response = await axios.get(`${API_URL}${params}`, getAuthHeader());
        return response.data;
    },

    async searchResources(query) {
        const response = await axios.get(`${API_URL}/search?query=${encodeURIComponent(query)}`, getAuthHeader());
        return response.data;
    },

    async createNote(title, content, tags = []) {
        const response = await axios.post(`${API_URL}/notes`, { title, content, tags }, getAuthHeader());
        return response.data;
    },

    async createLink(title, url, description, tags = []) {
        const response = await axios.post(`${API_URL}/links`, { title, url, description, tags }, getAuthHeader());
        return response.data;
    },

    async uploadFile(file, tags = []) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tags', JSON.stringify(tags));
        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                ...getAuthHeader().headers,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    async toggleFavorite(resourceId, favorite) {
        const response = await axios.put(`${API_URL}/${resourceId}/favorite?favorite=${favorite}`, {}, getAuthHeader());
        return response.data;
    },

    async deleteResource(resourceId) {
        const response = await axios.delete(`${API_URL}/${resourceId}`, getAuthHeader());
        return response.data;
    },

    async generateFlashcards(resourceId) {
        const response = await axios.post(`${API_URL}/${resourceId}/flashcards`, {}, getAuthHeader());
        return response.data;
    },

    async updateResource(resourceId, data) {
        const response = await axios.put(`${API_URL}/${resourceId}`, data, getAuthHeader());
        return response.data;
    },

    async getResource(resourceId) {
        const response = await axios.get(`${API_URL}/${resourceId}`, getAuthHeader());
        return response.data;
    }
};
