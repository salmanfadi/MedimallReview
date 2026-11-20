import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const sampleData = [
  {
    'Name': 'Salman Faris',
    'Phone': '9876543210',
    'Branch': 'Kunnamangalam',
    'Visit Time': '2026-11-20 10:15',
  },
  {
    'Name': 'Ananya Das',
    'Phone': '+91 94471 23456',
    'Branch': 'Malappuram',
    'Visit Time': '2026-11-20 11:30',
  },
  {
    'Name': 'Muhammed Nihal',
    'Phone': '09846012345',
    'Branch': 'Kunnamangalam',
    'Visit Time': '2026-11-20 12:45',
  },
  {
    'Name': 'Fathima Zahra',
    'Phone': '919495112233',
    'Branch': 'Malappuram',
    'Visit Time': '2026-11-20 14:00',
  },
  // Intentional invalid rows to demonstrate FR-2 validation & flagging
  {
    'Name': '',
    'Phone': '9876543210',
    'Branch': 'Kunnamangalam',
    'Visit Time': '2026-11-20 15:00',
  },
  {
    'Name': 'Invalid Phone Demo',
    'Phone': '12345',
    'Branch': 'Malappuram',
    'Visit Time': '2026-11-20 15:30',
  },
  {
    'Name': 'Unknown Branch Demo',
    'Phone': '9876543210',
    'Branch': 'Calicut Hospital',
    'Visit Time': '2026-11-20 16:00',
  },
];

const sampleDir = path.join(process.cwd(), 'sample-data');
if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

const worksheet = XLSX.utils.json_to_sheet(sampleData);
worksheet['!cols'] = [
  { wch: 22 },
  { wch: 18 },
  { wch: 20 },
  { wch: 20 },
];
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');

const targetPath = path.join(sampleDir, 'Medimall_Sample_Patients.xlsx');
XLSX.writeFile(workbook, targetPath);
console.log(`Generated sample file at: ${targetPath}`);
