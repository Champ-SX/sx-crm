const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Test the LINE friends import format
console.log('Testing LINE Friends Import Format\n');
console.log('=' .repeat(60));

// Create a test file with sample LINE friends
const testData = [
  {
    'Name': 'John Smith',
    'Line ID': 'U1234567890abcdef1234567890abcde',
    'Tags': 'VIP,Marketing',
  },
  {
    'Name': 'Jane Doe',
    'Line ID': 'U1234567890abcdef1234567890abcd2',
    'Tags': 'Event,Brand',
  },
  {
    'Name': 'Bob Johnson',
    'Line ID': 'U1234567890abcdef1234567890abcd3',
    'Tags': 'Hotel',
  },
];

// Create workbook
const ws = XLSX.utils.json_to_sheet(testData);
ws['!cols'] = [
  { wch: 25 }, // Name
  { wch: 35 }, // Line ID
  { wch: 30 }, // Tags
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Friends');

const testFilePath = path.join(process.cwd(), 'test-line-friends.xlsx');
XLSX.writeFile(wb, testFilePath);

console.log('\n✓ Test file created: test-line-friends.xlsx');

// Read and verify
const wb2 = XLSX.readFile(testFilePath);
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const readData = XLSX.utils.sheet_to_json(ws2);

console.log('\n📋 Sample Data from Test File:\n');
readData.forEach((row, idx) => {
  console.log(`Row ${idx + 1}:`);
  console.log(`  Name: ${row.Name}`);
  console.log(`  Line ID: ${row['Line ID']}`);
  console.log(`  Tags: ${row.Tags}\n`);
});

// Simulate the parser
console.log('=' .repeat(60));
console.log('\n🔄 Simulating Parser Output:\n');

const parseLineFriends = (rows) => {
  return rows
    .filter((r) => r['Name'] || r['Line ID'])
    .map((r) => ({
      contactName: r['Name'] || '',
      companyName: r['Name'] || '',
      email: '',
      phone: '',
      notes: '',
      category: r['Tags'] || 'brand',
      lineId: r['Line ID'],
    }));
};

const parsed = parseLineFriends(readData);
console.log('Parsed contacts:');
parsed.forEach((contact, idx) => {
  console.log(`\n${idx + 1}. ${contact.contactName}`);
  console.log(`   - LINE ID: ${contact.lineId}`);
  console.log(`   - Category: ${contact.category}`);
  console.log(`   - Company: ${contact.companyName}`);
});

console.log(`\n✓ Total contacts parsed: ${parsed.length}`);

// Cleanup
fs.unlinkSync(testFilePath);
console.log('\n✓ Test file cleaned up');
console.log('\n' + '=' .repeat(60));
console.log('✅ LINE Friends Import Test Complete!\n');
