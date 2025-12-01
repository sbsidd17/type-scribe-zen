import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TestResult {
  id: string;
  wpm: number;
  accuracy: number;
  time_taken: number;
  total_words: number;
  correct_words_count: number;
  incorrect_words: number;
  gross_wpm: number;
  completed_at: string;
  typing_tests?: {
    title: string;
    category: string;
    language: string;
    content?: string;
  };
}

interface TopUser {
  result_id: string;
  user_id: string;
  wpm: number;
  accuracy: number;
  time_taken: number;
  total_words: number;
  display_name: string;
}

// Add website branding header to PDF
const addBrandingHeader = (doc: jsPDF, title: string) => {
  // Add logo or branding area
  doc.setFillColor(34, 41, 47); // Dark background
  doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
  
  // Add website name/title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Typing Test Pro', 15, 15);
  
  // Add subtitle/report title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 15, 23);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
};

// Add footer with page numbers and date
const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  const pageSize = doc.internal.pageSize;
  const pageHeight = pageSize.height;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`,
      pageSize.width / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
};

// Format time in MM:SS
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const exportUserTestHistory = (userName: string, testHistory: TestResult[]) => {
  const doc = new jsPDF();
  
  // Add branding header
  addBrandingHeader(doc, `Test History Report - ${userName}`);
  
  // Add user info section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`User: ${userName}`, 15, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Tests Completed: ${testHistory.length}`, 15, 52);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 58);
  
  // Calculate statistics
  if (testHistory.length > 0) {
    const avgWpm = testHistory.reduce((sum, r) => sum + Number(r.wpm), 0) / testHistory.length;
    const avgAccuracy = testHistory.reduce((sum, r) => sum + Number(r.accuracy), 0) / testHistory.length;
    const bestWpm = Math.max(...testHistory.map(r => Number(r.wpm)));
    
    doc.text(`Average WPM: ${avgWpm.toFixed(1)} | Average Accuracy: ${avgAccuracy.toFixed(1)}% | Best WPM: ${bestWpm.toFixed(1)}`, 15, 64);
  }
  
  // Prepare table data
  const tableData = testHistory.map((result, index) => [
    (index + 1).toString(),
    result.typing_tests?.title || 'Unknown Test',
    result.typing_tests?.category || 'N/A',
    result.typing_tests?.language || 'N/A',
    Number(result.wpm).toFixed(1),
    `${Number(result.accuracy).toFixed(1)}%`,
    formatTime(result.time_taken),
    result.total_words?.toString() || '0',
    result.correct_words_count?.toString() || '0',
    result.incorrect_words?.toString() || '0',
    result.gross_wpm ? Number(result.gross_wpm).toFixed(1) : 'N/A',
    new Date(result.completed_at).toLocaleDateString()
  ]);
  
  // Add table
  autoTable(doc, {
    startY: 72,
    head: [['#', 'Test Title', 'Category', 'Language', 'WPM', 'Accuracy', 'Time', 'Words', 'Correct', 'Incorrect', 'Gross WPM', 'Date']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 41, 47],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15 },
      4: { cellWidth: 12 },
      5: { cellWidth: 15 },
      6: { cellWidth: 12 },
      7: { cellWidth: 12 },
      8: { cellWidth: 12 },
      9: { cellWidth: 15 },
      10: { cellWidth: 15 },
      11: { cellWidth: 18 }
    },
    margin: { left: 10, right: 10 }
  });
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  doc.save(`${userName.replace(/\s+/g, '_')}_test_history_${Date.now()}.pdf`);
};

export const exportTopUsersByDate = async (date: string, topUsers: TopUser[], testTitle?: string) => {
  const doc = new jsPDF();
  
  const reportTitle = testTitle 
    ? `Top Users - ${testTitle}` 
    : `Top Users - ${new Date(date).toLocaleDateString()}`;
  
  // Add branding header
  addBrandingHeader(doc, reportTitle);
  
  // Add report info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, 15, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Qualified Users: ${topUsers.length}`, 15, 52);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 58);
  doc.text('Qualification: 85%+ accuracy AND (10+ minutes OR 400+ words)', 15, 64);
  
  // Prepare table data
  const tableData = topUsers.map((user, index) => [
    (index + 1).toString(),
    user.display_name,
    Number(user.wpm).toFixed(1),
    `${Number(user.accuracy).toFixed(1)}%`,
    formatTime(user.time_taken),
    user.total_words?.toString() || '0',
  ]);
  
  // Add table
  autoTable(doc, {
    startY: 72,
    head: [['Rank', 'User Name', 'WPM', 'Accuracy', 'Time Taken', 'Total Words']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 41, 47],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' }
    }
  });
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  const fileName = testTitle 
    ? `top_users_${testTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`
    : `top_users_${date}_${Date.now()}.pdf`;
  doc.save(fileName);
};

export const exportAllTimeTopUsers = (topUsers: TopUser[]) => {
  const doc = new jsPDF();
  
  // Add branding header
  addBrandingHeader(doc, 'All-Time Top Users');
  
  // Add report info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('All-Time Top Users Leaderboard', 15, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Qualified Users: ${topUsers.length}`, 15, 52);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 58);
  doc.text('Qualification: 85%+ accuracy AND (10+ minutes OR 400+ words)', 15, 64);
  
  // Prepare table data
  const tableData = topUsers.map((user, index) => [
    (index + 1).toString(),
    user.display_name,
    Number(user.wpm).toFixed(1),
    `${Number(user.accuracy).toFixed(1)}%`,
    formatTime(user.time_taken),
    user.total_words?.toString() || '0',
  ]);
  
  // Add table
  autoTable(doc, {
    startY: 72,
    head: [['Rank', 'User Name', 'WPM', 'Accuracy', 'Time Taken', 'Total Words']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 41, 47],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' }
    }
  });
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  doc.save(`all_time_top_users_${Date.now()}.pdf`);
};

export const exportPerTestTopUsers = (testTitle: string, testContent: string, topUsers: TopUser[]) => {
  const doc = new jsPDF();
  
  // Add branding header
  addBrandingHeader(doc, `Top Users - ${testTitle}`);
  
  // Add test info section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Test: ${testTitle}`, 15, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Qualified Users: ${topUsers.length}`, 15, 52);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 58);
  
  // Add test content preview
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  const contentPreview = testContent.substring(0, 200) + (testContent.length > 200 ? '...' : '');
  const splitContent = doc.splitTextToSize(contentPreview, 180);
  doc.text('Test Content Preview:', 15, 66);
  doc.text(splitContent, 15, 71);
  
  doc.setTextColor(0, 0, 0);
  
  // Calculate startY based on content preview length
  const startY = 71 + (splitContent.length * 4) + 6;
  
  // Prepare table data
  const tableData = topUsers.map((user, index) => [
    (index + 1).toString(),
    user.display_name,
    Number(user.wpm).toFixed(1),
    `${Number(user.accuracy).toFixed(1)}%`,
    formatTime(user.time_taken),
    user.total_words?.toString() || '0',
  ]);
  
  // Add table
  autoTable(doc, {
    startY: startY,
    head: [['Rank', 'User Name', 'WPM', 'Accuracy', 'Time Taken', 'Total Words']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [34, 41, 47],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 30, halign: 'center' }
    }
  });
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  doc.save(`top_users_${testTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};
