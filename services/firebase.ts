// Re-implementing as a mock service to remove dependency on external Firebase package which is missing/broken.
// Using LocalStorage for persistence.

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

class MockAuth {
  currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    const stored = localStorage.getItem('cric_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    this.listeners.push(callback);
    // Fire immediately to inform the listener of current state
    setTimeout(() => callback(this.currentUser), 0);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signInWithPopup() {
    // Simulate Google Login
    const mockUser: User = {
      uid: 'user_' + Date.now(),
      displayName: 'Admin User',
      email: 'admin@example.com',
      photoURL: null
    };
    this.currentUser = mockUser;
    localStorage.setItem('cric_user', JSON.stringify(mockUser));
    this.notify();
    return { user: mockUser };
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('cric_user');
    this.notify();
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentUser));
  }
}

export const auth = new MockAuth();
export const db = {}; // Mock DB object, not used with LocalStorage implementation
export const googleProvider = {};

// Mock functions to mimic firebase/auth exports used in the app
export const signInWithPopup = async (authInstance: any, provider: any) => {
  return authInstance.signInWithPopup();
};

export const signOut = async (authInstance: any) => {
  return authInstance.signOut();
};

export const onAuthStateChanged = (authInstance: any, callback: (user: User | null) => void) => {
  return authInstance.onAuthStateChanged(callback);
};