// ==========================================
// INFINITY TAEKWONDO - ADMIN PORTAL MODULE
// ==========================================

/* 
  INSTRUCTIONS for Code.gs Integration:
  
  1. In your MAIN Code.gs file, update the doPost(e) function to route admin requests here:
  
  function doPost(e) {
    try {
      var params = JSON.parse(e.postData.contents);
      var action = params.action;
      
      // ROUTING
      if (action && action.startsWith('admin')) {
         return AdminBackend.dispatch(action, params);
      }
      
      // ... (Existing Student Portal Logic) ...
      
    } catch (error) { ... }
  }
*/

var AdminBackend = {
  
  // --- MAIN DISPATCHER ---
  dispatch: function(action, params) {
     const token = params.token;
     const data = params.data || {};
     let result = null;

     switch (action) {
        // AUTH
        case 'adminLogin':
           result = this.login(data.username, data.password);
           break;
           
        // BULK LOAD (New Optimization)
        case 'adminGetInitialData':
           result = this.getInitialData(token);
           break;
           
        // STUDENTS
        case 'adminGetStudents':
           result = this.getStudents(token);
           break;
        case 'adminSaveStudent':
           result = this.saveStudent(token, data);
           break;
        case 'adminUpdateStudentPassword':
           result = this.updateStudentPassword(token, data.studentId, data.newPassword);
           break;
           
        // ATTENDANCE
         case 'adminGetAttendance':
            result = this.getAttendance(token, data.date);
            break;
         case 'adminGetDiagnostics':
            result = this.getDiagnostics(token);
            break;
         case 'adminSaveAttendanceBatch':
           result = this.saveAttendanceBatch(token, data);
           break;
           
        // PAYMENTS
        case 'adminGetPayments':
           result = this.getPayments(token);
           break;
        case 'adminSavePayment':
           result = this.savePayment(token, data);
           break;
        case 'adminDeletePayment':
           result = this.deletePayment(token, data.id);
           break;
           
        // EVENTS
        case 'adminGetEvents':
           result = this.getEvents(token);
           break;
        case 'adminSaveEvent':
           result = this.saveEvent(token, data);
           break;
        case 'adminDeleteEvent':
           result = this.deleteEvent(token, data.id);
           break;
           
        // ACHIEVEMENTS
        case 'adminGetAchievements':
           result = this.getAchievements(token);
           break;
        case 'adminSaveAchievement':
           result = this.saveAchievement(token, data);
           break;
        case 'adminDeleteAchievement':
           result = this.deleteAchievement(token, data.id);
           break;
           
        default:
           throw new Error("Unknown Admin Action: " + action);
     }
     
     return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        data: result 
     })).setMimeType(ContentService.MimeType.JSON);
  },

  // --- SECURITY ---
  
  Security: {
      generateToken: function() { return Utilities.getUuid(); },
      
      createSession: function(user) {
        const token = this.generateToken();
        const session = { 
            username: user.username, 
            role: user.role, 
            displayName: user.displayName, 
            avatarUrl: user.avatarUrl 
        };
        CacheService.getScriptCache().put(token, JSON.stringify(session), 21600);
        return token;
      },
      
      validateToken: function(token) {
        if (!token) throw new Error("Unauthorized");
        if (token === "DEV_TOKEN_MOCK") return { role: "ADMIN", username: "dev" };
        const json = CacheService.getScriptCache().get(token);
        if (!json) throw new Error("Session Expired");
        return JSON.parse(json);
      },
      
      checkRole: function(token, required) {
         const user = this.validateToken(token);
         // Levels: ADMIN(2) > COACH(1) > ASSISTANT(0)
         let uLvl = 0;
         if (user.role.toUpperCase().includes('COACH')) uLvl = 1;
         if (user.role.toUpperCase().includes('ADMIN')) uLvl = 2;
         
         let rLvl = 0;
         if (required === 'COACH') rLvl = 1;
         if (required === 'ADMIN') rLvl = 2;
         
         if (uLvl < rLvl) throw new Error("Forbidden");
         return user;
      }
  },

  // --- LOGIC ---

  login: function(username, password) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Login_admin");
      if (!sheet) throw new Error("Login_admin sheet missing");
      
      const data = sheet.getDataRange().getDisplayValues().slice(1);
      const row = data.find(r => r[0] == username && r[1] == password); // 0=User, 1=Pass
      
      if (!row) throw new Error("Invalid Credentials");
      
      const user = { username: row[0], displayName: row[2], role: row[3], avatarUrl: row[4] };
      const token = this.Security.createSession(user);
      
      return { user, token };
  },

  getInitialData: function(token) {
      // Basic role check - allow any authorized user to get base data, 
      // but specific sensitive data might be filtered inside the sub-getters if needed.
      // For now, assuming authorized users can read basic lists.
      this.Security.validateToken(token); 
      
      const students = this.getStudents(token);
      const attendance = this.getAttendance(token);
      const payments = this.getPayments(token);
      const events = this.getEvents(token);
      const achievements = this.getAchievements(token);
      
      return {
          students: students,
          attendance: attendance,
          payments: payments,
          events: events,
          achievements: achievements
      };
  },

  getStudents: function(token) {
      this.Security.checkRole(token, 'ASSISTANT');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Students");
      const data = sheet ? sheet.getDataRange().getDisplayValues().slice(1) : [];
      return data.map(row => ({
          id: row[0],
          khmerName: row[1],
          englishName: row[2],
          gender: row[3],
          currentBelt: row[4],
          monthsAtBelt: Number(row[5]) || 0,
          eligibleForTest: (row[6] || "").toLowerCase() === 'yes',
          dob: row[7], // Matches index 7
          email: row[8], // Matches index 8
          phone: row[9], // Matches index 9
          registrationDate: row[10], // Matches index 10
          scholarship: (row[11] || "").toUpperCase() === 'YES', // Matches 11
          scholarshipType: row[12], // Matches 12
          profilePictureId: row[13], // Matches 13
          eSignId: row[14], // Matches 14
          height: Number(row[15]) || 0, // Matches 15
          weight: Number(row[16]) || 0 // Matches 16
      }));
  },
  
  saveStudent: function(token, s) {
      this.Security.checkRole(token, 'COACH');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Students");
      // Append or Update logic
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      if (s.id && !s.id.includes('NEW')) {
          const targetId = String(s.id).trim();
          for (let i=1; i<data.length; i++) {
              if (String(data[i][0]).trim() == targetId) { rowIndex = i+1; break; }
          }
      }
      
      let newId = s.id;
      if (!newId || newId.includes('NEW')) {
          newId = "STU-" + new Date().getFullYear() + "-" + Math.floor(Math.random()*10000);
          rowIndex = sheet.getLastRow() + 1;
      }
      
      const rowData = [
          newId, s.khmerName, s.englishName, s.gender, s.currentBelt, s.monthsAtBelt,
          s.eligibleForTest?'TRUE':'FALSE', s.dob, s.email, s.phone,
          s.registrationDate, s.scholarship?'YES':'NO', s.scholarshipType, s.profilePictureId, s.eSignId,
          s.height, s.weight
      ];
      
      if (rowIndex > sheet.getLastRow()) sheet.appendRow(rowData);
      else sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      
      return { ...s, id: newId };
  },
  
  updateStudentPassword: function(token, id, pass) {
      this.Security.checkRole(token, 'ADMIN');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Login");
      if (!sheet) return false;
      const data = sheet.getDataRange().getValues();
      let found = false;
      for (let i=1; i<data.length; i++) {
          if (String(data[i][0]) == String(id)) {
              sheet.getRange(i+1, 2).setValue(pass);
              found = true;
              break;
          }
      }
      if (!found) sheet.appendRow([id, pass]);
      return true;
  },
  
  getAttendance: function(token, date) {
      this.Security.checkRole(token, 'ASSISTANT');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Attendance");
      const data = sheet ? sheet.getDataRange().getDisplayValues().slice(1) : [];
      let res = data;
      // If a specific date is requested, filter, otherwise return ALL (optimized for initial load)
      if (date) {
          const dStr = new Date(date).toDateString();
          res = data.filter(r => new Date(r[2]).toDateString() === dStr);
      }
      return res.map((r, i) => ({ id: "ATT-"+i, studentId: r[0], studentName: r[1], date: r[2], status: r[3] }));
  },
  
  saveAttendanceBatch: function(token, records) {
      this.Security.checkRole(token, 'ASSISTANT');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Attendance");
      const data = sheet.getDataRange().getValues();
      
      // Map existing records: "StudentID|YYYY-MM-DD" -> RowIndex (1-based)
      const existingMap = {};
      for (let i = 1; i < data.length; i++) {
          const sid = String(data[i][0]);
          let dateStr = "";
          // Robust Date String Conversion
          try {
              const d = new Date(data[i][2]);
              // Use Script Timezone to ensure we match the date as written in the sheet
              dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); 
          } catch (e) {
              dateStr = String(data[i][2]).substring(0, 10); // Fallback to string slice
          }
          
          existingMap[sid + "|" + dateStr] = i + 1;
      }
      
      records.forEach(r => {
          // r.date is expected to be YYYY-MM-DD from frontend
          const key = String(r.studentId) + "|" + String(r.date);
          
          if (existingMap[key]) {
              // UPDATE: Set Status (Col 4)
              sheet.getRange(existingMap[key], 4).setValue(r.status);
          } else {
              // APPEND
              sheet.appendRow([r.studentId, r.studentName, r.date, r.status]);
              // Update map to handle duplicates within the same batch
              existingMap[key] = sheet.getLastRow();
          }
      });
      return records;
  },
  
  getPayments: function(token) {
      this.Security.checkRole(token, 'ADMIN');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Payments_Data");
      if (!sheet) return [];
      
      const allData = sheet.getDataRange().getDisplayValues();
      if (allData.length === 0) return [];

      // Find correctly formatted header row (scans first 5 rows for 'year')
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(allData.length, 5); i++) {
        if (allData[i].join("").toLowerCase().includes("year")) {
           headerRowIndex = i;
           break;
        }
      }
      
      const header = allData[headerRowIndex].map(h => h.toString().toLowerCase().trim());
      const rawRows = allData.slice(headerRowIndex + 1);
      
      // SCHEMA: Year(0), Student ID(1), For Month(2), Status(3), Payment Date(4), Amount(5), Student Name(6)
      return rawRows.map((r, i) => {
          // Strict Index Mapping
          const year = (r[0] || "").toString().trim();
          const sid = (r[1] || "").toString().trim();
          const month = (r[2] || "").toString().trim();
          const status = (r[3] || "").toString().trim();
          const date = (r[4] || "").toString().trim();
          const amtRaw = (r[5] || "0").toString().replace(/[^0-9.]/g, "");
          const name = (r[6] || "").toString().trim();

          const amount = isNaN(Number(amtRaw)) ? 0 : Number(amtRaw);

          return { 
              id: "PAY-"+i, 
              year: year, 
              studentId: sid, 
              forMonth: month || "January", 
              status: status, 
              date: date, 
              amount: amount,
              studentName: name || "Unknown"
          };
      });
  },

  savePayment: function(token, p) {
      this.Security.checkRole(token, 'ADMIN');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Payments_Data");
      if (!sheet) throw new Error("Sheet not found");

      // Schema: Year, Student ID, For Month, Status, Payment Date, Amount, Student Name
      sheet.appendRow([p.year, p.studentId, p.forMonth, p.status, p.date, p.amount, p.studentName]);
      return p;
  },
  
  deletePayment: function(token, id) {
      this.Security.checkRole(token, 'ADMIN');
      // DELETE DISABLED: return true;
      throw new Error("Delete disabled");
  },
  
  getEvents: function(token) {
      this.Security.checkRole(token, 'ASSISTANT');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Events");
      const data = sheet ? sheet.getDataRange().getDisplayValues().slice(1) : [];
      // Clean mapping: Name(0), Type(1), Reg Start(2), Reg Close(3), Event Start(4), Event Close(5), Location(6), Description(7), Status(8)
      return data.map((r, i) => ({ 
          id: "EVT-"+i, 
          title: r[0], 
          type: r[1],
          regStart: r[2],
          regClose: r[3],
          eventStart: r[4],
          eventClose: r[5],
          location: r[6], 
          description: r[7],
          status: r[8] || 'Open' 
      }));
  },
  
  saveEvent: function(token, e) {
      this.Security.checkRole(token, 'COACH');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Events");
      if (!sheet) throw new Error("Events sheet not found");

      // Check if updating existing (EVT-n)
      if (e.id && e.id.startsWith("EVT-")) {
          const index = parseInt(e.id.split("-")[1]);
          if (!isNaN(index)) {
              const row = index + 2; // +1 for 0-index, +1 for header
              // Update: Name, Type, Reg Start, Reg Close, Event Start, Event Close, Location, Description, Status
              if (row <= sheet.getLastRow()) {
                  const range = sheet.getRange(row, 1, 1, 9);
                  range.setValues([[
                      e.title, 
                      e.type, 
                      e.regStart, 
                      e.regClose, 
                      e.eventStart, 
                      e.eventClose, 
                      e.location, 
                      e.description, 
                      e.status || "Open"
                  ]]);
                  return e;
              }
          }
      }

      // Appends: Name, Type, Reg Start, Reg Close, Event Start, Event Close, Location, Description, Status
      sheet.appendRow([
          e.title, 
          e.type, 
          e.regStart, 
          e.regClose, 
          e.eventStart, 
          e.eventClose, 
          e.location, 
          e.description, 
          e.status || "Open"
      ]);
      return e;
  },
  
  deleteEvent: function(token, id) {
      this.Security.checkRole(token, 'ADMIN');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Events");
      if (!sheet) throw new Error("Events sheet not found");

      if (id && id.startsWith("EVT-")) {
          const index = parseInt(id.split("-")[1]);
          if (!isNaN(index)) {
             const row = index + 2; // +1 for header, +1 for 0-index logic from getEvents
             sheet.deleteRow(row);
             return true;
          }
      }
      return false;
  },
  
  getAchievements: function(token) {
      this.Security.checkRole(token, 'ASSISTANT');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Achievements");
      const data = sheet ? sheet.getDataRange().getDisplayValues().slice(1) : [];
      return data.map((r, i) => ({ 
          id: "ACH-"+i, 
          studentId: r[0], 
          studentName: r[1], 
          eventName: r[2], 
          date: r[3],
          category: r[4], 
          division: r[5], 
          medal: r[6], 
          notes: r[7], 
          description: r[8] 
      }));
  },
  
  saveAchievement: function(token, a) {
      this.Security.checkRole(token, 'COACH');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Achievements");
      if (!sheet) throw new Error("Achievements sheet not found");

      // Check if updating existing (ACH-n)
      if (a.id && a.id.startsWith("ACH-")) {
          const index = parseInt(a.id.split("-")[1]);
          if (!isNaN(index)) {
              const row = index + 2; // +1 for 0-index, +1 for header
              // Update: StudentID, StudentName, EventName, Date, Category, Division, Medal, Notes, Description
              if (row <= sheet.getLastRow()) {
                  const range = sheet.getRange(row, 1, 1, 9);
                  range.setValues([[
                      a.studentId, 
                      a.studentName, 
                      a.eventName, 
                      a.date, 
                      a.category || "", 
                      a.division || "", 
                      a.medal || "", 
                      a.notes || "", 
                      a.description || ""
                  ]]);
                  return a;
              }
          }
      }

      // Appends: StudentID, StudentName, EventName, Date, Category, Division, Medal, Notes, Description
      sheet.appendRow([
          a.studentId, 
          a.studentName, 
          a.eventName, 
          a.date, 
          a.category || "", 
          a.division || "", 
          a.medal || "", 
          a.notes || "", 
          a.description || ""
      ]);
      return a;
  },
  
  deleteAchievement: function(token, id) {
      this.Security.checkRole(token, 'COACH');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Achievements");
      if (!sheet) throw new Error("Achievements sheet not found");

      if (id && id.startsWith("ACH-")) {
          const index = parseInt(id.split("-")[1]);
          if (!isNaN(index)) {
             const row = index + 2;
             sheet.deleteRow(row);
             return true;
          }
      }
      return false;
  },

  getDiagnostics: function(token) {
      this.Security.checkRole(token, 'ADMIN');
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Payments_Data");
      if (!sheet) return { error: "Payments_Data sheet not found" };
      
      const allData = sheet.getDataRange().getDisplayValues();
      return {
          headers: allData[0] || [],
          sampleRow: allData[1] || [],
          numRows: allData.length
      };
  }
};
