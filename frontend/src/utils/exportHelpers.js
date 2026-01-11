/**
 * Export Helpers Utility
 * Contains functions for exporting dashboard data (PDF, CSV, Images)
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export dashboard as PDF
 */
export const exportToPDF = async (containerRef, filename = 'analytics-dashboard') => {
  try {
    const element = containerRef.current;
    if (!element) {
      throw new Error('Container element not found');
    }

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#0F172A', // Dark navy background
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Save PDF with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`${filename}-${timestamp}.pdf`);

    return { success: true, message: 'PDF exported successfully' };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Export analytics data as CSV
 */
export const exportToCSV = (analyticsData, filename = 'analytics-data') => {
  try {
    const csvRows = [
      ['Analytics Dashboard Export'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Key Metrics', ''],
      ['Total Tasks', analyticsData.totalTasks || 0],
      ['Completion Rate', `${analyticsData.completionRate || 0}%`],
      ['Average Time Per Task', `${analyticsData.averageTime || 0} hours`],
      ['Productivity Score', analyticsData.productivityScore || 0],
      [''],
      ['Task Status Distribution', ''],
      ['Status', 'Count'],
      ['Completed', analyticsData.completed || 0],
      ['In Progress', analyticsData.in_progress || 0],
      ['Todo', analyticsData.todo || 0],
      [''],
      ['Priority Distribution', ''],
      ['Priority', 'Count']
    ];

    // Add priority distribution
    if (analyticsData.priority_distribution) {
      Object.entries(analyticsData.priority_distribution).forEach(([priority, count]) => {
        csvRows.push([priority.charAt(0).toUpperCase() + priority.slice(1), count]);
      });
    }

    // Add weekly workload if available
    if (analyticsData.weeklyWorkload && analyticsData.weeklyWorkload.length > 0) {
      csvRows.push(['']);
      csvRows.push(['Weekly Workload', '']);
      csvRows.push(['Date', 'Tasks', 'Hours']);
      analyticsData.weeklyWorkload.forEach(day => {
        csvRows.push([day.date, day.tasks, day.hours.toFixed(1)]);
      });
    }

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `${filename}-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, message: 'CSV exported successfully' };
  } catch (error) {
    console.error('CSV export error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Export single chart as image (PNG)
 */
export const exportChartAsImage = async (chartId, filename = 'chart', format = 'png') => {
  try {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) {
      throw new Error(`Chart element with id '${chartId}' not found`);
    }

    // Capture chart as canvas
    const canvas = await html2canvas(chartElement, {
      scale: 2,
      backgroundColor: '#1E293B', // Dark slate background
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    // Convert to image URL
    const url = canvas.toDataURL(`image/${format}`);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `${filename}-${timestamp}.${format}`;
    link.click();

    return { success: true, message: `Chart exported as ${format.toUpperCase()}` };
  } catch (error) {
    console.error('Chart export error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Export all charts as images
 */
export const exportAllChartsAsImages = async (chartIds, filenamePrefix = 'chart') => {
  try {
    const results = [];

    for (const { id, name } of chartIds) {
      const result = await exportChartAsImage(id, `${filenamePrefix}-${name}`);
      results.push({ name, ...result });
      // Small delay to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount === results.length,
      message: `Exported ${successCount}/${results.length} charts successfully`,
      results
    };
  } catch (error) {
    console.error('Batch export error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Export data as JSON (for debugging or data backup)
 */
export const exportToJSON = (analyticsData, filename = 'analytics-data') => {
  try {
    const jsonString = JSON.stringify(analyticsData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.download = `${filename}-${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true, message: 'JSON exported successfully' };
  } catch (error) {
    console.error('JSON export error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Prepare element for PDF export (hide scrollbars, adjust for print)
 */
export const prepareElementForExport = (element) => {
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;

  element.style.overflow = 'visible';
  element.style.height = 'auto';

  return () => {
    element.style.overflow = originalOverflow;
    element.style.height = originalHeight;
  };
};

/**
 * Show export notification (toast)
 */
export const showExportNotification = (message, type = 'success') => {
  // This can be integrated with your toast notification system
  console.log(`[Export ${type}]:`, message);
  // If you have a toast system, call it here
  // For example: toast.success(message) or toast.error(message)
};
