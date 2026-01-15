import axios from 'axios';
import { authService } from './auth.service';

const API_URL = 'http://localhost:8000/api/chat';

const getAuthHeader = async () => {
    const token = await authService.getToken();
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

export const chatService = {
    async getChats() {
        const response = await axios.get(`${API_URL}/chats`, await getAuthHeader());
        return response.data;
    },

    async getMessages(chatType, chatId) {
        const response = await axios.get(`${API_URL}/messages/${chatType}/${chatId}`, await getAuthHeader());
        return response.data;
    },

    async getAIHistory() {
        const response = await axios.get(`${API_URL}/ai/history`, await getAuthHeader());
        return response.data;
    },

    async sendMessage(chatType, chatId, content) {
        const response = await axios.post(`${API_URL}/send`, {
            chat_type: chatType,
            chat_id: chatId,
            content: content
        }, await getAuthHeader());
        return response.data;
    },

    // Legacy AI endpoint (basic)
    async sendAIProgress(message) {
        const response = await axios.post(`${API_URL}/ai`, { message }, await getAuthHeader());
        return response.data;
    },

    // Enhanced AI endpoint with document support
    async sendAIMessage(message, file = null, contextScope = 'tasks,study_plans,wellbeing') {
        const formData = new FormData();
        formData.append('message', message);
        formData.append('context_scope', contextScope);
        if (file) {
            formData.append('file', file);
        }
        const authHeader = await getAuthHeader();
        const response = await axios.post(`${API_URL}/ai/enhanced`, formData, {
            ...authHeader,
            headers: {
                ...authHeader.headers,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    // Execute slash command
    async executeCommand(command) {
        const response = await axios.post(`${API_URL}/ai/command`, { command }, await getAuthHeader());
        return response.data;
    },

    // Get available commands for autocomplete
    async getCommands() {
        const response = await axios.get(`${API_URL}/ai/commands`, await getAuthHeader());
        return response.data;
    },

    // Get command suggestions based on partial input
    async suggestCommands(partial) {
        const response = await axios.get(`${API_URL}/ai/commands/suggest?partial=${encodeURIComponent(partial)}`, await getAuthHeader());
        return response.data;
    },

    // Search AI chat history
    async searchAIHistory(query) {
        const response = await axios.get(`${API_URL}/ai/history/search?query=${encodeURIComponent(query)}`, await getAuthHeader());
        return response.data;
    },

    // Clear AI chat history
    async clearAIHistory() {
        const response = await axios.delete(`${API_URL}/ai/history`, await getAuthHeader());
        return response.data;
    },

    // Get AI context preview (what data AI can see)
    async getAIContext() {
        const response = await axios.get(`${API_URL}/ai/context`, await getAuthHeader());
        return response.data;
    },

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/upload`, formData, await getAuthHeader());
        return response.data;
    },

    async getUsers() {
        const response = await axios.get(`${API_URL}/users`, await getAuthHeader());
        return response.data;
    },

    async searchUsers(query) {
        const response = await axios.get(`${API_URL}/users/search?query=${encodeURIComponent(query)}`, await getAuthHeader());
        return response.data;
    }
};
