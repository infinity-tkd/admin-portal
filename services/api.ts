
import { Student, Attendance, Payment, Event, User, Role, Achievement } from '../types';

export interface AdminUser {
  username: string;
  password?: string; // Optional for updates
  displayName: string;
  role: 'admin' | 'coach' | 'assistant_coach';
  avatarUrl?: string;
}

export interface StudentLogin {
  studentId: string;
  name?: string;
  hasPassword: boolean;
}
import { MOCK_STUDENTS, MOCK_ATTENDANCE, MOCK_PAYMENTS, MOCK_EVENTS, MOCK_ACHIEVEMENTS } from './mockData';

const API_URL = import.meta.env.VITE_API_URL || '';
const USE_MOCK = false; // Production Ready: Using Real API

class ApiService {
  // Utility for basic storage obfuscation
  private encodeData(data: string): string {
    try { return btoa(encodeURIComponent(data)); } catch { return data; }
  }
  private decodeData(data: string): string {
    try { return decodeURIComponent(atob(data)); } catch { return data; }
  }

  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.initAuth();
  }

  private initAuth() {
    const rawToken = localStorage.getItem('auth_token_enc') || sessionStorage.getItem('auth_token_enc');
    if (rawToken) this.token = this.decodeData(rawToken);

    const rawUser = localStorage.getItem('auth_user_enc') || sessionStorage.getItem('auth_user_enc');
    if (rawUser) {
        try { this.currentUser = JSON.parse(this.decodeData(rawUser)); } catch { this.currentUser = null; }
    }
  }

  // --- CORE CALLER ---
  private async callApi(action: string, data: any = {}): Promise<any> {
    if (USE_MOCK) {
      console.log(`[MOCK] Calling ${action}`, data);
      return null;
    }

    try {
      const payload = {
        action: action,
        token: this.token,
        data: data
      };

      // CACHE BUSTING: Add timestamp to URL to prevent GAS caching
      const urlWithTimestamp = `${API_URL}?t=${Date.now()}`;

      const response = await fetch(urlWithTimestamp, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Network Error: ${response.statusText}`);
      }

      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Unknown API Error');
      }

      return json.data;

    } catch (error) {
      console.error(`API Call Failed [${action}]:`, error);
      throw error;
    }
  }


  // --- Initial Data ---
  async getInitialData(): Promise<any> {
    if (!USE_MOCK) return this.callApi('adminGetInitialData');
    await new Promise(r => setTimeout(r, 1500)); // Simulate longer load
    return {
      students: [...MOCK_STUDENTS],
      attendance: [...MOCK_ATTENDANCE],
      payments: [...MOCK_PAYMENTS],
      events: [...MOCK_EVENTS],
      activeStudentsCount: MOCK_STUDENTS.length, // Placeholder for mock
      users: [],
      studentLogins: []
    };
  }

  // --- Auth & Session ---

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  async login(username: string, password: string, rememberMe: boolean = false): Promise<User | null> {
    if (!USE_MOCK) {
      try {
        // NOTE: Action is 'adminLogin' to match AdminBackend dispatch
        const result = await this.callApi('adminLogin', { username, password });
        if (result && result.token) {
          const user: User = {
            username: result.user.username,
            role: result.user.role.toLowerCase(),
            name: result.user.displayName,
            avatarUrl: result.user.avatarUrl,
            token: result.token
          };
          this.token = result.token;
          this.currentUser = user;

          const storage = rememberMe ? localStorage : sessionStorage;
          const other = rememberMe ? sessionStorage : localStorage;

          storage.setItem('auth_token_enc', this.encodeData(result.token));
          storage.setItem('auth_user_enc', this.encodeData(JSON.stringify(user)));

          // Clear other storage to prevent conflicting states
          other.removeItem('auth_token_enc');
          other.removeItem('auth_user_enc');

          return user;
        }
      } catch (e) {
        console.error("Login call failed", e);
        return null;
      }
    }

    // MOCK LOGIN
    await new Promise(r => setTimeout(r, 800));
    if (username === 'admin' && password === 'admin123') {
      const u: User = { username: 'admin', role: 'admin', name: 'Master Admin', token: 'mock-token-admin' };
      this.token = u.token; this.currentUser = u;
      return u;
    }
    return null;
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('auth_token_enc');
    localStorage.removeItem('auth_user_enc');
    sessionStorage.removeItem('auth_token_enc');
    sessionStorage.removeItem('auth_user_enc');
  }


  // --- Students ---
  async getStudents(): Promise<Student[]> {
    if (!USE_MOCK) {
      const data = await this.callApi('adminGetStudents');
      const validData = (data || []).filter((s: Student) => s && s.id && s.englishName);

      return validData;
    }
    await new Promise(r => setTimeout(r, 500));
    return [...MOCK_STUDENTS];
  }

  async saveStudent(student: Student): Promise<Student> {
    if (!USE_MOCK) return this.callApi('adminSaveStudent', student);
    await new Promise(r => setTimeout(r, 800));
    return student;
  }

  async patchStudent(id: string, updates: Partial<Student>): Promise<void> {
    if (!USE_MOCK) return this.callApi('adminPatchStudent', { id, updates });
    await new Promise(r => setTimeout(r, 500));
  }



  async deleteStudent(id: string): Promise<void> {
    // Not implemented in backend yet
  }

  // --- Attendance ---
  async getAttendance(date?: string): Promise<Attendance[]> {
    if (!USE_MOCK) {
      const data = await this.callApi('adminGetAttendance', { date });
      // FILTER: Valid records only
      return (data || []).filter((a: Attendance) => a && a.id && a.studentName);
    }
    await new Promise(r => setTimeout(r, 500));
    if (date) return MOCK_ATTENDANCE.filter(a => a.date === date);
    return [...MOCK_ATTENDANCE];
  }

  async saveAttendanceBatch(records: Attendance[]): Promise<Attendance[]> {
    if (!USE_MOCK) return this.callApi('adminSaveAttendanceBatch', records);
    await new Promise(r => setTimeout(r, 800));
    return records;
  }

  // --- Payments ---
  async getPayments(): Promise<Payment[]> {
    if (!USE_MOCK) {
      const data = await this.callApi('adminGetPayments');
      // FILTER: Valid records only (Relaxed to allow student ID as fallback)
      return (data || []).filter((p: Payment) => p && p.id && (p.studentName || p.studentId));
    }
    await new Promise(r => setTimeout(r, 500));
    return [...MOCK_PAYMENTS];
  }

  async savePayment(payment: Payment): Promise<Payment> {
    if (!USE_MOCK) return this.callApi('adminSavePayment', payment);
    await new Promise(r => setTimeout(r, 600));
    return payment;
  }

  async deletePayment(id: string): Promise<void> {
    if (!USE_MOCK) return this.callApi('adminDeletePayment', { id });
    await new Promise(r => setTimeout(r, 500));
  }

  // --- Events ---
  async getEvents(): Promise<Event[]> {
    if (!USE_MOCK) return this.callApi('adminGetEvents');
    await new Promise(r => setTimeout(r, 500));
    return [...MOCK_EVENTS];
  }

  async saveEvent(event: Event): Promise<Event> {
    if (!USE_MOCK) return this.callApi('adminSaveEvent', event);
    await new Promise(r => setTimeout(r, 600));
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    if (!USE_MOCK) return this.callApi('adminDeleteEvent', { id });
    await new Promise(r => setTimeout(r, 500));
  }

  // --- Achievements ---
  async getAchievements(): Promise<Achievement[]> {
    if (!USE_MOCK) return this.callApi('adminGetAchievements');
    await new Promise(r => setTimeout(r, 500));
    return [...MOCK_ACHIEVEMENTS];
  }

  async saveAchievement(achievement: Achievement): Promise<Achievement> {
    if (!USE_MOCK) return this.callApi('adminSaveAchievement', achievement);
    await new Promise(r => setTimeout(r, 600));
    return achievement;
  }

  async deleteAchievement(id: string): Promise<void> {
    if (!USE_MOCK) return this.callApi('adminDeleteAchievement', { id });
    await new Promise(r => setTimeout(r, 500));
  }

  // --- USER MANAGEMENT (TEAM) ---
  async getUsers(): Promise<AdminUser[]> {
    if (!USE_MOCK) return this.callApi('adminGetUsers');
    await new Promise(r => setTimeout(r, 500));
    return [];
  }

  async saveUser(user: AdminUser): Promise<AdminUser> {
    if (!USE_MOCK) return this.callApi('adminSaveUser', user);
    await new Promise(r => setTimeout(r, 500));
    return user;
  }

  async deleteUser(username: string): Promise<boolean> {
    if (!USE_MOCK) return this.callApi('adminDeleteUser', { username });
    await new Promise(r => setTimeout(r, 500));
    return true;
  }

  // --- STUDENT ACCESS ---
  async getStudentLogins(): Promise<StudentLogin[]> {
    if (!USE_MOCK) return this.callApi('adminGetStudentLogins');
    await new Promise(r => setTimeout(r, 500));
    return [];
  }

  async updateStudentPassword(studentId: string, newPass: string): Promise<boolean> {
    if (!USE_MOCK) return this.callApi('adminUpdateStudentPassword', { studentId, newPassword: newPass });
    await new Promise(r => setTimeout(r, 500));
    return true;
  }
}

export const api = new ApiService();
