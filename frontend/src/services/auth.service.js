import { auth } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const authService = {
  async register(email, password, fullName, role, usn) {
    // Register with backend
    const payload = {
      email,
      password,
      full_name: fullName,
      role
    };

    // Only include usn if provided
    if (usn) {
      payload.usn = usn;
    }

    const response = await axios.post(`${API_URL}/auth/register`, payload);

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('token', token);

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(response.data));

    return response.data;
  },

  async login(email, password) {
    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('token', token);

    // Fetch user data from backend
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(response.data));

    return response.data;
  },

  async logout() {
    await signOut(auth);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
