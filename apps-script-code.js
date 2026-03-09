/**
 * Grade 7 Science Platform — Google Apps Script
 * 
 * PASTE THIS ENTIRE FILE into your Apps Script Code.gs
 * See implementation_plan.md for full setup instructions.
 */

// ===== POST: Student submits a grade =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();
    
    // Check for existing row (same student + same quiz)
    const existing = findRow(sheet, data.email, data.quizId);
    
    const row = [
      data.timestamp || new Date().toISOString(),
      data.name || 'Unknown',
      data.email || '',
      data.quizId || '',
      data.lessonTitle || '',
      data.score || 0,
      data.total || 0,
      data.percentage || 0,
      data.passed ? 'Yes' : 'No',
      data.attempts || 1,
      data.remediationUsed ? 'Yes' : 'No'
    ];
    
    if (existing > 0) {
      // Update if new score is better
      const oldPct = sheet.getRange(existing, 8).getValue();
      if (data.percentage >= oldPct) {
        sheet.getRange(existing, 1, 1, row.length).setValues([row]);
      } else {
        // Still update attempts count
        sheet.getRange(existing, 10).setValue(data.attempts || 1);
      }
    } else {
      sheet.appendRow(row);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== GET: Dashboard fetches all grades =====
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'status';
    
    if (action === 'getGrades') {
      const grades = getAllGrades();
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, grades: grades }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default: health check
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Grade 7 Science API is running' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== HELPERS =====

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Grades');
  if (!sheet) {
    sheet = ss.insertSheet('Grades');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Timestamp', 'Student Name', 'Student Email', 'Quiz ID', 'Lesson',
      'Score', 'Total', 'Percentage', 'Passed', 'Attempts', 'Remediation'
    ]]);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow(sheet, email, quizId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email && data[i][3] === quizId) return i + 1;
  }
  return 0;
}

function getAllGrades() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = ['timestamp','studentName','studentEmail','quizId','lesson','score','total','percentage','passed','attempts','remediation'];
  const grades = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach(function(h, j) { obj[h] = data[i][j]; });
    grades.push(obj);
  }
  return grades;
}
