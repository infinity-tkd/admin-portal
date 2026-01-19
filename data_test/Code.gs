// ==========================================
// 1. SHEET AUTOMATION (Original Logic)
// ==========================================

function onEdit(e) {
  const tracker = "Payment_Tracker";
  const dataSheetName = "Payments_Data";

  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== tracker) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();
  const ss = SpreadsheetApp.getActive();
  const dataSheet = ss.getSheetByName(dataSheetName);

  // YEAR CHANGE → LOAD DATA
  if (e.range.getA1Notation() === "D1") {
    loadYearData();
    return;
  }

  // MONTH EDIT ONLY (D4:O)
  if (row < 4 || col < 4 || col > 15) return;

  const year = sheet.getRange("D1").getValue();
  const studentId = sheet.getRange(row, 1).getValue();
  const month = sheet.getRange(3, col).getValue();
  const status = e.value || "";

  if (!year || !studentId || !month) return;

  const data = dataSheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (
      data[i][0] == year &&
      data[i][1] == studentId &&
      data[i][2] == month
    ) {
      dataSheet.getRange(i + 1, 4).setValue(status);
      dataSheet.getRange(i + 1, 5).setValue(new Date());
      found = true;
      break;
    }
  }

  if (!found && status !== "") {
    dataSheet.appendRow([
      year,
      studentId,
      month,
      status,
      new Date()
    ]);
  }
}

function loadYearData() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Payment_Tracker");
  const dataSheet = ss.getSheetByName("Payments_Data");

  const year = sheet.getRange("D1").getValue();
  const students = sheet.getRange("A4:A").getValues();
  const months = sheet.getRange("D3:O3").getValues()[0];

  sheet.getRange("D4:O").clearContent();

  const data = dataSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == year) {
      const studentRow = students.findIndex(r => r[0] == data[i][1]);
      const monthCol = months.findIndex(m => m == data[i][2]);

      if (studentRow !== -1 && monthCol !== -1) {
        sheet
          .getRange(studentRow + 4, monthCol + 4)
          .setValue(data[i][3]);
      }
    }
  }
}

// ==========================================
// 2. API LOGIC (Single-Fetch Architecture)
// ==========================================

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var data = null;

    switch (action) {
      case 'login':
        // CRITICAL: Now returns EVERYTHING needed for the app
        data = performFullLogin(params.id, params.pass);
        break;
        
      // Keep individual getters just in case, or for refresh
      case 'getHomeData':
        data = getMembershipStatus(params.studentId);
        break;
      case 'getEvents':
        data = getEvents();
        break;
      case 'getAchievements':
        data = getAchievements(params.studentId);
        break;
      case 'getHistory':
        data = getHistory(params.studentId);
        break;
      case 'getAttendance':
        data = getAttendanceData(params.studentId);
        break;
      case 'getLibrary':
        data = getAllCurriculum(); 
        break;
      case 'getBeltPhilosophy':
         data = getBeltPhilosophyData(params.belt);
         break;
      default:
        throw new Error("Unknown action: " + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      data: data 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Super-Function: Validates user AND fetches all related data in one go.
 */
function performFullLogin(id, pass) {
  // 1. Authenticate
  const student = checkLogin(id, pass);
  
  // 2. Fetch all other data using the found Student ID
  const studentId = student.id;
  
  return {
    student: student,
    dashboard: getMembershipStatus(studentId),
    events: getEvents(),
    achievements: getAchievements(studentId),
    attendance: getAttendanceData(studentId),
    history: getHistory(studentId),
    library: getAllCurriculum(),
    payments: getPayments(studentId),
    beltPhilosophy: getBeltPhilosophyData(student.belt)
  };
}

function getPayments(studentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Payments_Data");
  if (!sheet) return [];
  
  // Columns: Year, Student ID, For Month, Status, Payment Date, Amount, Student Name
  // Col A=Year, B=ID, C=Month, D=Status, E=Date, F=Amount
  const data = sheet.getDataRange().getDisplayValues().slice(1);
  
  const payments = data.filter(row => row[1].toString().trim().toUpperCase() === studentId.toString().trim().toUpperCase());
  
  return payments.map((row, i) => ({
    id: "pay-" + i,
    year: row[0],
    studentId: row[1],
    month: row[2],
    status: row[3],
    date: row[4],
    amount: row[5]
  }));
}

// --- CORE HELPERS ---

function checkLogin(id, pass) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const loginSheet = ss.getSheetByName("Login");
  const studentSheet = ss.getSheetByName("Students");

  if (!loginSheet || !studentSheet) throw new Error("Critical Sheets Missing (Login/Students)");

  const loginData = loginSheet.getDataRange().getValues();
  let targetId = id.toString().trim().toUpperCase();
  let targetPass = pass.toString().trim();
  let authenticatedFullId = null;

  for (let i = 1; i < loginData.length; i++) {
    let sheetId = loginData[i][0].toString().trim().toUpperCase();
    let sheetPass = loginData[i][1].toString().trim();
    
    // Check match or partial match (e.g. 001 vs STU-001)
    if ((sheetId === targetId || sheetId.endsWith("-" + targetId)) && sheetPass === targetPass) {
      authenticatedFullId = sheetId;
      break;
    }
  }

  if (!authenticatedFullId) {
    throw new Error("Invalid Student ID or Password");
  }

  // Fetch Full Profile
  const studentData = studentSheet.getDataRange().getDisplayValues();
  for (let j = 1; j < studentData.length; j++) {
    let row = studentData[j];
    if (row[0].toString().trim().toUpperCase() === authenticatedFullId) {
      let picId = row[13]; 
      // FIX IMAGE: Ensure ID is clean. If empty, use placeholder.
      let picUrl;
      if (picId && picId.trim().length > 5) {
        picUrl = `https://drive.google.com/thumbnail?id=${picId}&sz=s700`;
      } else {
        // Fallback placeholder based on gender? Or generic.
        picUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
      }
      
      return {
        id: row[0],
        nameKH: row[1],
        nameEN: row[2],
        gender: row[3],
        belt: row[4],
        monthsAtBelt: row[5],
        eligible: row[6],
        dob: row[7],
        email: row[8],
        phone: row[9],
        joinDate: row[10],
        isScholarship: (row[11] || "").toString().toUpperCase() === 'YES',
        scholarshipType: (row[12] || "General").toString(),
        pic: picUrl
      };
    }
  }
  throw new Error("Login successful but Profile Data not found.");
}

function getMembershipStatus(studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Payments_Data");
  
  if (!sheet) return { isPaid: false, month: "", details: null };

  const data = sheet.getDataRange().getDisplayValues().slice(1);
  const now = new Date();
  const currentMonthYear = Utilities.formatDate(now, Session.getScriptTimeZone(), "MMM-yyyy"); 
  
  // Match on Col B (Student ID) and Col C (Month)
  const payment = data.find(row => 
    row[1].toString().trim().toUpperCase() === studentId.toString().trim().toUpperCase() && 
    row[2].toString().trim() === currentMonthYear
  );
  
  return {
    isPaid: !!payment,
    month: currentMonthYear,
    details: payment ? { status: payment[3], date: payment[4], amount: "PAID" } : null
  };
}

function getEvents() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Events");
  if (!sheet) return [];
  const rows = sheet.getDataRange().getDisplayValues().slice(1);
  
  // Structure: Name, Type, Reg Start, Reg Close, Event Start, Event Close, Location, Description, Status
  return rows.map((r, i) => ({
    id: "evt-" + i, // Generate synthetic ID since sheet has none
    title: r[0],
    type: r[1],
    regStart: r[2],
    regEnd: r[3],
    eventStart: r[4],
    eventEnd: r[5],
    location: r[6],
    description: r[7],
    status: r[8] || (isEventOpen(r[3]) ? 'Open' : 'Closed') // Use explicit status if avail, else calc from reg close
  }));
}

function isEventOpen(regEndString) {
  if (!regEndString) return false;
  // Parse date safely
  try {
    const today = new Date();
    const end = new Date(regEndString);
    return today <= end;
  } catch (e) { return false; }
}

function getAchievements(studentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Achievements");
  if (!sheet) return [];
  
  // Structure: 0:StudentID, 1:StudentName, 2:EventName, 3:Date, 4:Category, 5:Division, 6:Medal, 7:Notes, 8:Description
  const data = sheet.getDataRange().getDisplayValues().slice(1);
  
  const studentAchievements = data.filter(row => row[0].toString().trim().toUpperCase() === studentId.toString().trim().toUpperCase());
  
  // Sort desc by date
  studentAchievements.sort((a, b) => new Date(b[3]) - new Date(a[3]));

  return studentAchievements.map((row, i) => ({
    id: "ach-" + i, // Generate synthetic ID
    studentId: row[0],
    title: row[2],
    date: row[3],
    category: row[4],
    division: row[5],
    medal: row[6],
    notes: row[7],
    description: row[8]
  }));
}

function getHistory(studentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Belt History");
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues().slice(1); // Col A = ID
  
  const history = data.filter(row => row[0].toString().trim().toUpperCase() === studentId.toString().trim().toUpperCase());
  
  return history.map((row, idx) => ({
    id: idx.toString(),
    studentId: row[0],
    rank: row[1], 
    date: row[2], 
    result: row[3] 
  }));
}

function getAttendanceData(studentId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Attendance");
  if (!sheet || sheet.getLastRow() < 2) return [];
  
  // Col A=ID, B=Name, C=Date, D=Status
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getDisplayValues();
  
  const myData = data.filter(row => row[0].toString().trim().toUpperCase() === studentId.toString().trim().toUpperCase());
  
  // Sort latest first
  myData.sort((a, b) => new Date(b[2]) - new Date(a[2]));

  return myData.map((row, idx) => ({
    id: idx.toString(),
    studentId: row[0],
    date: row[2],
    status: row[3]
  }));
}

function getAllCurriculum() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Belt_Curriculum");
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues().slice(1);
  
  return data.map(function(row, idx) {
    return {
      id: "lib-" + idx,
      belt: row[0],
      category: row[1],
      title: row[2],
      subTitle: row[3],
      description: row[4],
      focus: row[5],
      videoUrl: row[6],
      tag: row[7],
      level: row[8],
      prerequisite: row[9]
    };
  });
}

function getBeltPhilosophyData(beltLevel) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Belt_Philosophy");
  if (!sheet) return { found: false };
  
  const data = sheet.getDataRange().getDisplayValues();
  const searchBelt = (beltLevel || "").toString().toLowerCase().trim();
  
  const row = data.find(r => r[0].toString().toLowerCase().trim() === searchBelt);
  
  if (row) {
    return {
      found: true,
      belt: row[0],
      meaning: row[1],
      quote: row[2],
      spirit: row[3]
    };
  }
  return { found: false };
}