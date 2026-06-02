const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Read the original Excel file with Thai data
const excelPath = '/tmp/sx_crm_thai_data_full.xlsx';

if (!fs.existsSync(excelPath)) {
  console.error('❌ Excel file not found:', excelPath);
  process.exit(1);
}

const wb = XLSX.readFile(excelPath);

// Extract company and contact data
const companiesSheet = wb.Sheets['companies'];
const contactsSheet = wb.Sheets['contact_persons'];

const companies = XLSX.utils.sheet_to_json(companiesSheet);
const contacts = XLSX.utils.sheet_to_json(contactsSheet);

console.log(`📊 Loaded ${companies.length} companies and ${contacts.length} contacts from Excel`);

// Generate SQL with correct PLURAL table names
const timestamp = '2026-05-29T10:00:05.908575+00:00';

let companyInserts = 'BEGIN TRANSACTION;\n';
companies.forEach(c => {
  const id = c.company_id || '';
  const name = (c.company_name || '').replace(/'/g, "''");
  const type = c.company_type || 'brand';
  const phone = (c.phone || '').replace(/'/g, "''");
  const email = (c.email || '').replace(/'/g, "''");
  const lineId = (c.line_id || '').replace(/'/g, "''");
  const social = (c.social || '').replace(/'/g, "''");
  const taxId = (c.tax_id || '').replace(/'/g, "''");
  const address = (c.registered_address || '').replace(/'/g, "''");
  const branchName = (c.branch_name || '').replace(/'/g, "''");
  const branchNum = (c.branch_number || '').replace(/'/g, "''");
  const bankName = (c.bank_name || '').replace(/'/g, "''");
  const bankAccNum = (c.bank_account_number || '').replace(/'/g, "''");
  const bankAccName = (c.bank_account_name || '').replace(/'/g, "''");
  const bankBranch = (c.bank_branch || '').replace(/'/g, "''");
  const billingNotes = (c.billing_notes || '').replace(/'/g, "''");
  const notes = (c.notes || '').replace(/'/g, "''");

  companyInserts += `INSERT INTO companies (company_id, company_name, company_type, phone, email, line_id, social, tax_id, registered_address, branch_name, branch_number, bank_name, bank_account_number, bank_account_name, bank_branch, billing_notes, notes, created_at, updated_at) VALUES ('${id}', '${name}', '${type}', '${phone}', '${email}', '${lineId}', '${social}', '${taxId}', '${address}', '${branchName}', '${branchNum}', '${bankName}', '${bankAccNum}', '${bankAccName}', '${bankBranch}', '${billingNotes}', '${notes}', '${timestamp}', '${timestamp}');\n`;
});
companyInserts += 'COMMIT;';

let contactInserts = 'BEGIN TRANSACTION;\n';
contacts.forEach(c => {
  const id = c.contact_id || '';
  const companyId = c.company_id || '';
  const name = (c.name || '').replace(/'/g, "''");
  const phone = (c.phone || '').replace(/'/g, "''");
  const email = (c.email || '').replace(/'/g, "''");
  const lineId = (c.line_id || '').replace(/'/g, "''");
  const role = (c.role || '').replace(/'/g, "''");
  const notes = (c.notes || '').replace(/'/g, "''");

  contactInserts += `INSERT INTO contact_persons (contact_id, company_id, name, phone, email, line_id, role, notes, created_at, updated_at) VALUES ('${id}', '${companyId}', '${name}', '${phone}', '${email}', '${lineId}', '${role}', '${notes}', '${timestamp}', '${timestamp}');\n`;
});
contactInserts += 'COMMIT;';

// Write to files
fs.writeFileSync('/tmp/sx_crm_companies.sql', companyInserts);
fs.writeFileSync('/tmp/sx_crm_contacts.sql', contactInserts);

console.log(`✅ Generated import SQL files:`);
console.log(`   - Companies: ${(companyInserts.length / 1024).toFixed(1)} KB`);
console.log(`   - Contacts: ${(contactInserts.length / 1024).toFixed(1)} KB`);
