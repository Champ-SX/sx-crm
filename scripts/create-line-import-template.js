const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create LINE Friends Import Template
const template = [
  {
    'Name': 'Example Friend 1',
    'Line ID': 'U1234567890abcdef1234567890abcdef',
    'Tags': 'VIP,Marketing',
  },
  {
    'Name': 'Example Friend 2',
    'Line ID': 'U1234567890abcdef1234567890abcde2',
    'Tags': 'Event,Brand',
  },
];

const ws = XLSX.utils.json_to_sheet(template);
ws['!cols'] = [
  { wch: 25 }, // Name
  { wch: 35 }, // Line ID
  { wch: 30 }, // Tags
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Friends');

const outputPath = path.join(process.cwd(), 'public', 'LINE-Friends-Import-Template.xlsx');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
XLSX.writeFile(wb, outputPath);

console.log(`✓ Template created: ${outputPath}`);
