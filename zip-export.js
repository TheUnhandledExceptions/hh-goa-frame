import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Packaging /export folder...');

const outputZip = path.join(__dirname, 'public', 'export.zip');

try {
  // Ensure the public directory exists
  if (!fs.existsSync(path.dirname(outputZip))) {
    fs.mkdirSync(path.dirname(outputZip), { recursive: true });
  }

  // Remove existing zip if it exists
  if (fs.existsSync(outputZip)) {
    fs.unlinkSync(outputZip);
  }

  // Use system zip command to compress the folder
  execSync(`zip -r ${outputZip} export/`, { stdio: 'inherit' });
  
  console.log(`\nSuccessfully created zip archive at ${outputZip}`);
} catch (error) {
  console.error('\nError creating zip archive:', error.message);
  process.exit(1);
}
