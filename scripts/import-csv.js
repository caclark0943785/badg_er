const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'participants.json');

function generateId() {
  return crypto.randomBytes(4).toString('hex');
}

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/import-csv.js <path-to-csv>');
    console.error('CSV format: name,date');
    console.error('Example:    Jane Doe,2026-02-13');
    process.exit(1);
  }

  const fullPath = path.resolve(csvPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  // Read existing participants
  let participants = [];
  if (fs.existsSync(DATA_FILE)) {
    participants = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }

  // Parse CSV
  const csv = fs.readFileSync(fullPath, 'utf8').trim();
  const lines = csv.split('\n');

  // Skip header if present
  const firstLine = lines[0].toLowerCase();
  const startIdx = (firstLine.includes('name') && firstLine.includes('date')) ? 1 : 0;

  const newParticipants = [];
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted CSV fields
    const parts = line.match(/(".*?"|[^,]+)/g);
    if (!parts || parts.length < 2) {
      console.warn(`Skipping malformed line ${i + 1}: ${line}`);
      continue;
    }

    const name = parts[0].replace(/^"|"$/g, '').trim();
    const date = parts[1].replace(/^"|"$/g, '').trim();

    if (!name || !date) {
      console.warn(`Skipping line ${i + 1}: missing name or date`);
      continue;
    }

    const participant = {
      id: generateId(),
      claimKey: crypto.randomBytes(6).toString('hex'),
      name,
      date,
      program: 'AI Opener Certificate',
    };

    newParticipants.push(participant);
  }

  if (newParticipants.length === 0) {
    console.log('No participants found in CSV.');
    process.exit(0);
  }

  // Append and save
  participants.push(...newParticipants);
  fs.writeFileSync(DATA_FILE, JSON.stringify(participants, null, 2) + '\n');

  // Print results
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  console.log(`\nImported ${newParticipants.length} participant(s):\n`);
  newParticipants.forEach(p => {
    console.log(`  ${p.name}`);
    console.log(`  Public:  ${baseUrl}/cert/${p.id}`);
    console.log(`  Claim:   ${baseUrl}/cert/${p.id}/claim/${p.claimKey}`);
    console.log();
  });
}

main();
