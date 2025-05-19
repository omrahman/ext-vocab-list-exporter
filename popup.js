'use strict';

// Constants
const CSV_FILENAME = 'translation_links.csv';
const CSV_HEADERS = ['Spanish', 'English', 'Link'];

// Store the results globally
let translationResults = [];

/**
 * Escapes special characters in CSV fields
 * @param {string} text - The text to escape
 * @returns {string} The escaped text
 */
function escapeCSV(text) {
  return `"${String(text).replace(/"/g, '""')}"`;
}

/**
 * Converts results to CSV format
 * @param {Array} results - Array of translation results
 * @returns {string} CSV formatted string
 */
function convertToCSV(results) {
  const csvRows = [CSV_HEADERS.join(',')];
  
  results.forEach(result => {
    const row = [
      escapeCSV(result.spanish),
      escapeCSV(result.english),
      escapeCSV(result.link)
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Downloads the CSV file
 * @param {string} csv - The CSV content to download
 */
function downloadCSV(csv) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { 
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: CSV_FILENAME,
    saveAs: true
  });
}

/**
 * Creates a table cell with the given content
 * @param {string} content - The cell content
 * @param {string} [className] - Optional CSS class name
 * @returns {HTMLTableCellElement} The created cell
 */
function createTableCell(content, className) {
  const cell = document.createElement('td');
  cell.textContent = content;
  if (className) {
    cell.className = className;
  }
  return cell;
}

/**
 * Creates a link cell with the given URL
 * @param {string} url - The URL for the link
 * @returns {HTMLTableCellElement} The created cell with link
 */
function createLinkCell(url) {
  const cell = document.createElement('td');
  cell.className = 'link-cell';
  
  const link = document.createElement('a');
  link.href = url;
  link.textContent = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  cell.appendChild(link);
  return cell;
}

/**
 * Updates the results table with the given data
 * @param {Array} results - Array of translation results
 */
function updateTable(results) {
  const thead = document.querySelector('.table-header');
  const tbody = document.getElementById('results-body');
  const exportBtn = document.getElementById('export-csv');
  
  tbody.innerHTML = '';
  
  if (!results?.length) {
    thead.classList.remove('visible');
    const row = document.createElement('tr');
    const cell = createTableCell('No translation links found on this page', 'message-cell no-results-message');
    cell.colSpan = 3;
    row.appendChild(cell);
    tbody.appendChild(row);
    exportBtn.style.display = 'none';
    return;
  }
  
  thead.classList.add('visible');
  
  results.forEach(result => {
    const row = document.createElement('tr');
    row.appendChild(createTableCell(result.spanish));
    row.appendChild(createTableCell(result.english));
    row.appendChild(createLinkCell(result.link));
    tbody.appendChild(row);
  });
  
  exportBtn.style.display = 'block';
}

/**
 * Executes the search in the active tab
 * @param {number} tabId - The ID of the tab to search in
 * @returns {Promise<void>}
 */
async function executeSearch(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    const response = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { action: 'findTranslateLinks' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    translationResults = response;
    updateTable(translationResults);
  } catch (error) {
    console.error('Error:', error);
    const tbody = document.getElementById('results-body');
    const thead = document.querySelector('.table-header');
    const exportBtn = document.getElementById('export-csv');
    
    thead.classList.remove('visible');
    const row = document.createElement('tr');
    const cell = createTableCell(`Error: ${error.message}`, 'message-cell error-message');
    cell.colSpan = 3;
    row.appendChild(cell);
    tbody.appendChild(row);
    exportBtn.style.display = 'none';
  }
}

// Event Listeners
document.getElementById('export-csv').addEventListener('click', () => {
  const csv = convertToCSV(translationResults);
  downloadCSV(csv);
});

document.getElementById('run-btn').addEventListener('click', async () => {
  translationResults = [];
  updateTable([]);
  
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs?.length) {
      throw new Error('No active tab found');
    }

    await executeSearch(tabs[0].id);
  } catch (error) {
    console.error('Error:', error);
    const tbody = document.getElementById('results-body');
    const thead = document.querySelector('.table-header');
    const exportBtn = document.getElementById('export-csv');
    
    thead.classList.remove('visible');
    const row = document.createElement('tr');
    const cell = createTableCell(`Error: ${error.message}`, 'message-cell error-message');
    cell.colSpan = 3;
    row.appendChild(cell);
    tbody.appendChild(row);
    exportBtn.style.display = 'none';
  }
}); 