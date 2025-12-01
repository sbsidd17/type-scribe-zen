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
  completed_at?: string;
  language?: string;
}

// Add website branding header to PDF
const addBrandingHeader = (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Single color modern background
  doc.setFillColor(79, 70, 229); // Indigo
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Add website name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TypeScribe Zen', 15, 16);
  
  // Add tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Master your typing skills', 15, 23);
  
  // Add clickable website link
  doc.setTextColor(253, 224, 71); // Bright yellow for visibility
  doc.setFontSize(9);
  const linkText = 'https://typescribe.vercel.app/';
  doc.textWithLink(linkText, 15, 29, { url: linkText });
  
  // Add report title on the right
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, pageWidth - titleWidth - 15, 20);
  
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
    result.typing_tests?.language?.toUpperCase() || 'N/A',
    Number(result.wpm).toFixed(1),
    `${Number(result.accuracy).toFixed(1)}%`,
    formatTime(result.time_taken),
    result.total_words?.toString() || '0',
    result.correct_words_count?.toString() || '0',
    result.incorrect_words?.toString() || '0',
    result.gross_wpm ? Number(result.gross_wpm).toFixed(1) : 'N/A',
    new Date(result.completed_at).toLocaleDateString(),
    new Date(result.completed_at).toLocaleTimeString()
  ]);
  
  // Add table
  autoTable(doc, {
    startY: 72,
    head: [['#', 'Test Title', 'Category', 'Lang', 'WPM', 'Acc', 'Time', 'Words', 'Correct', 'Incorrect', 'Gross', 'Date', 'Time']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 18 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 12, halign: 'center' },
      9: { cellWidth: 12, halign: 'center' },
      10: { cellWidth: 12, halign: 'center' },
      11: { cellWidth: 18, halign: 'center' },
      12: { cellWidth: 15, halign: 'center' }
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
  
  // Prepare table data with date and language columns
  const tableData = topUsers.map((user, index) => [
    (index + 1).toString(),
    user.display_name,
    Number(user.wpm).toFixed(1),
    `${Number(user.accuracy).toFixed(1)}%`,
    formatTime(user.time_taken),
    user.total_words?.toString() || '0',
    user.language?.toUpperCase() || 'N/A',
    new Date(date).toLocaleDateString()
  ]);
  
  // Add table
  autoTable(doc, {
    startY: 72,
    head: [['Rank', 'User Name', 'WPM', 'Accuracy', 'Time Taken', 'Total Words', 'Language', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' }
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
  
  // Prepare table data with date and language
  const tableData = topUsers.map((user, index) => [
    (index + 1).toString(),
    user.display_name,
    Number(user.wpm).toFixed(1),
    `${Number(user.accuracy).toFixed(1)}%`,
    formatTime(user.time_taken),
    user.total_words?.toString() || '0',
    user.language?.toUpperCase() || 'N/A',
    user.completed_at ? new Date(user.completed_at).toLocaleDateString() : 'N/A'
  ]);
  
  // Add table
  autoTable(doc, {
    startY: 72,
    head: [['Rank', 'User Name', 'WPM', 'Accuracy', 'Time Taken', 'Total Words', 'Language', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' }
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
  
  // Prepare table data with date and language
  const tableData = topUsers.map((user, index) => [
    (index + 1).toString(),
    user.display_name,
    Number(user.wpm).toFixed(1),
    `${Number(user.accuracy).toFixed(1)}%`,
    formatTime(user.time_taken),
    user.total_words?.toString() || '0',
    user.language?.toUpperCase() || 'N/A',
    user.completed_at ? new Date(user.completed_at).toLocaleDateString() : 'N/A'
  ]);
  
  // Add table
  autoTable(doc, {
    startY: startY,
    head: [['Rank', 'User Name', 'WPM', 'Accuracy', 'Time Taken', 'Total Words', 'Language', 'Date']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' }
    }
  });
  
  // Add footer
  addFooter(doc);
  
  // Save PDF
  doc.save(`top_users_${testTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
};
