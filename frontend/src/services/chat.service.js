import axios from 'axios';

const API_URL = 'http://localhost:8000/api/chat';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const chatService = {
    async getChats() {
        const response = await axios.get(`${API_URL}/chats`, getAuthHeader());
        return response.data;
    },

    async getMessages(chatType, chatId) {
        const response = await axios.get(`${API_URL}/messages/${chatType}/${chatId}`, getAuthHeader());
        return response.data;
    },

    async getAIHistory() {
        const response = await axios.get(`${API_URL}/ai/history`, getAuthHeader());
        return response.data;
    },

    async sendMessage(chatType, chatId, content) {
        const response = await axios.post(`${API_URL}/send`, {
            chat_type: chatType,
            chat_id: chatId,
            content: content
        }, getAuthHeader());
        return response.data;
    },

    async sendAIProgress(message) {
        const response = await axios.post(`${API_URL}/ai`, { message }, getAuthHeader());
        return response.data;
    },

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                ...getAuthHeader().headers,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    async getUsers() {
        const response = await axios.get(`${API_URL}/users`, getAuthHeader());
        return response.data;
    },

    async searchUsers(query) {
        const response = await axios.get(`${API_URL}/users/search?query=${encodeURIComponent(query)}`, getAuthHeader());
        return response.data;
    }
};
