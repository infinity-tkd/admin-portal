
import { Student, Attendance, Payment, Event, Achievement } from '../types';

export const MOCK_STUDENTS: Student[] = [
  { id: 'STU-F-001', khmerName: 'សៅពេជ្រ រិទ្ធីណា', englishName: 'Saopich Rithyna', gender: 'Female', currentBelt: 'Black 1 Poom/Dan', monthsAtBelt: 2, eligibleForTest: false, dob: '2008-02-21', email: 'pichrithynaa@gmail.com', phone: '081 570 816', registrationDate: '2025-08-18', scholarship: true, scholarshipType: 'Full', profilePictureId: '123' },
  { id: 'STU-M-002', khmerName: 'ហាក់ លីម៉េង', englishName: 'Hak Lymeng', gender: 'Male', currentBelt: 'Yellow', monthsAtBelt: 4, eligibleForTest: true, dob: '2009-07-20', email: 'lymeng7051@gmail.com', phone: '095328185', registrationDate: '2025-08-18', scholarship: true, scholarshipType: 'Athlete' },
  { id: 'STU-F-003', khmerName: 'អុឹង ចំរើនរាសី', englishName: 'Oeng Chamroeunreasey', gender: 'Female', currentBelt: 'Black 1 Poom/Dan', monthsAtBelt: 21, eligibleForTest: true, dob: '2009-12-31', email: 'chamroeunreaseyoeng777@gmail.com', phone: '017319161', registrationDate: '2025-08-18', scholarship: false },
  { id: 'STU-F-004', khmerName: 'មិត សុធា', englishName: 'Sothea Mith', gender: 'Female', currentBelt: 'Yellow', monthsAtBelt: 4, eligibleForTest: true, dob: '2009-02-12', email: 'sothea4564@gmail.com', phone: '0764977501', registrationDate: '2025-09-14', scholarship: false },
  { id: 'STU-F-006', khmerName: 'នៅ ធីតាពីន', englishName: 'Neou Thidapin', gender: 'Female', currentBelt: 'Black 2 Poom/Dan', monthsAtBelt: 14, eligibleForTest: false, dob: '2005-10-20', email: 'thidapinneou@gmail.com', phone: '0766609276', registrationDate: '2025-09-25', scholarship: true, scholarshipType: '20%' },
  { id: 'STU-F-007', khmerName: 'អាពូបាកា រ៉ូសនាវ៉ាត្តី', englishName: 'Aboubakar Rosnavattey', gender: 'Female', currentBelt: 'Black 1 Poom/Dan', monthsAtBelt: 24, eligibleForTest: true, dob: '2009-06-17', email: 'rosnavatey2009@gmail.com', phone: '0963586064', registrationDate: '2025-09-28', scholarship: true, scholarshipType: 'Women in Sport' },
  { id: 'STU-M-020', khmerName: 'សុភា រតនៈ', englishName: 'Sophea Ratanak', gender: 'Male', currentBelt: 'Blue', monthsAtBelt: 1, eligibleForTest: false, dob: '2007-11-03', email: 'sophearatanakk@gmail.com', phone: '016759209', registrationDate: '2025-11-12', scholarship: false, height: 177, weight: 65 },
];

export const MOCK_ATTENDANCE: Attendance[] = [
  { id: 'ATT-001', studentId: 'STU-F-001', studentName: 'Saopich Rithyna', date: '2025-05-20', status: 'Present', classId: 'C-01' },
  { id: 'ATT-002', studentId: 'STU-M-002', studentName: 'Hak Lymeng', date: '2025-05-20', status: 'Absent', classId: 'C-01' },
  { id: 'ATT-003', studentId: 'STU-F-003', studentName: 'Oeng Chamroeunreasey', date: '2025-05-20', status: 'Present', classId: 'C-01' },
  { id: 'ATT-004', studentId: 'STU-F-001', studentName: 'Saopich Rithyna', date: '2025-05-18', status: 'Present', classId: 'C-01' },
];

export const MOCK_PAYMENTS: Payment[] = [
  { id: 'PAY-001', studentId: 'STU-F-003', studentName: 'Oeng Chamroeunreasey', amount: 30, currency: 'USD', date: '2025-05-01', type: 'Tuition', status: 'Paid' },
  { id: 'PAY-002', studentId: 'STU-F-004', studentName: 'Sothea Mith', amount: 30, currency: 'USD', date: '2025-05-02', type: 'Tuition', status: 'Unpaid' },
];

export const MOCK_EVENTS: Event[] = [
  { id: 'EVT-001', title: 'Belt Testing - Q2', date: '2025-06-15', location: 'Main Dojang', description: 'Quarterly belt testing for eligible students.' },
  { id: 'EVT-002', title: 'National Championship', date: '2025-07-20', location: 'Olympic Stadium', description: 'National level competition.' },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ACH-001',
    studentId: 'STU-F-001',
    studentName: 'Saopich Rithyna',
    eventName: 'City Championship',
    category: 'Sparring',
    division: 'Junior Female -45kg',
    medal: 'Gold',
    date: '2024-11-10',
    notes: 'Dominant performance in finals.'
  },
  {
    id: 'ACH-002',
    studentId: 'STU-M-002',
    studentName: 'Hak Lymeng',
    eventName: 'Annual Team Showcase',
    category: 'Poomsae',
    division: 'Pair Poomsae',
    medal: 'Best Technique',
    date: '2024-12-15',
    notes: 'Awarded for outstanding synchronization.'
  },
  {
    id: 'ACH-003',
    studentId: 'STU-F-003',
    studentName: 'Oeng Chamroeunreasey',
    eventName: 'National Selections',
    category: 'Sparring',
    division: 'Cadet Female -51kg',
    medal: 'Silver',
    date: '2025-01-20',
    notes: 'Qualified for national team training camp.'
  }
];
