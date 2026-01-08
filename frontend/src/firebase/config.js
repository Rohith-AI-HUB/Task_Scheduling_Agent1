import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {

  apiKey: "AIzaSyDR6FzxxSQsViEWJotpYAYEdpD0pDL4p5U",

  authDomain: "task-2998c.firebaseapp.com",

  projectId: "task-2998c",

  storageBucket: "task-2998c.firebasestorage.app",

  messagingSenderId: "703894074510",

  appId: "1:703894074510:web:1a28993b7b6dd7af9285df",

  measurementId: "G-F3GKQ0N4EB"

};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
