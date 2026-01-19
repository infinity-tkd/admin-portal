
export type Role = 'admin' | 'coach' | 'assistant_coach';

export interface User {
  username: string;
  role: 'admin' | 'coach' | 'assistant_coach';
  name: string; // display_name
  avatarUrl?: string;
  token?: string;
}

export interface Student {
  id: string;
  khmerName: string;
  englishName: string;
  gender: 'Male' | 'Female';
  currentBelt: string;
  monthsAtBelt: number;
  eligibleForTest: boolean;
  dob: string;
  email: string;
  phone: string;
  registrationDate: string;
  scholarship: boolean;
  scholarshipType?: string;
  profilePictureId?: string;
  eSignId?: string;
  height?: number;
  weight?: number;
  lastGradingDate?: string;
  stripes?: number;
  instructorNotes?: string;
  password?: string; // Only used for updates
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  classId: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName?: string;
  amount: number;
  currency?: 'USD' | 'KHR'; // Visual only, backend assumes USD/Base
  date: string;
  year: string;
  forMonth: string;
  status: 'Paid' | 'Unpaid';
}

export interface Event {
  id: string;
  title: string;
  type: string;
  regStart: string;
  regClose: string;
  eventStart: string;
  eventClose: string;
  location: string;
  description: string;
  status: 'Open' | 'Closed' | 'Upcoming' | 'Completed';
}

export interface Achievement {
  id: string;
  studentId: string;
  studentName: string;
  eventName: string; // Was 'title' or similar, now explicit
  date: string;
  category: string; // Sparring, Poomsae, etc.
  division: string; // Age/Weight
  medal: 'Gold' | 'Silver' | 'Bronze' | 'Participate' | string;
  notes?: string;
  description?: string;
}
