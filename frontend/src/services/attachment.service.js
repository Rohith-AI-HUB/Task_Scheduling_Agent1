import axios from 'axios';

const API_URL = 'http://localhost:8000/api/tasks';

const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const attachmentService = {
    /**
     * Upload a file attachment to a task
     * @param {string} taskId - Task ID
     * @param {File} file - File to upload
     */
    async uploadAttachment(taskId, file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
            `${API_URL}/${taskId}/attachments`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data;
    },

    /**
     * Delete an attachment from a task
     * @param {string} taskId - Task ID
     * @param {string} attachmentId - Attachment ID
     */
    async deleteAttachment(taskId, attachmentId) {
        const response = await axios.delete(
            `${API_URL}/${taskId}/attachments/${attachmentId}`,
            getAuthHeader()
        );
        return response.data;
    },

    /**
     * Add a note to a task
     * @param {string} taskId - Task ID
     * @param {string} content - Note content
     */
    async addNote(taskId, content) {
        const response = await axios.post(
            `${API_URL}/${taskId}/notes`,
            { content },
            getAuthHeader()
        );
        return response.data;
    },

    /**
     * Get all notes for a task
     * @param {string} taskId - Task ID
     */
    async getNotes(taskId) {
        const response = await axios.get(
            `${API_URL}/${taskId}/notes`,
            getAuthHeader()
        );
        return response.data;
    },

    /**
     * Delete a note from a task
     * @param {string} taskId - Task ID
     * @param {string} noteId - Note ID
     */
    async deleteNote(taskId, noteId) {
        const response = await axios.delete(
            `${API_URL}/${taskId}/notes/${noteId}`,
            getAuthHeader()
        );
        return response.data;
    },

    /**
     * Get the download URL for an attachment
     * @param {string} filename - Stored filename
     */
    getDownloadUrl(filename) {
        return `${API_URL}/attachments/${filename}`;
    }
};
