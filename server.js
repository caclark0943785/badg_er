require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ORG_NAME = process.env.ORG_NAME || 'Miles+Partnership';

const DATA_FILE = path.join(__dirname, 'data', 'participants.json');
const TEMPLATE_PATH = path.join(__dirname, 'assets', 'certificate-template.png');
const HTML_TEMPLATE = path.join(__dirname, 'views', 'certificate.html');

// In-memory image cache
const imageCache = new Map();

// Load participants from JSON
function loadParticipants() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function getParticipant(id) {
  const participants = loadParticipants();
  return participants.find(p => p.id === id);
}

// Format date nicely
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Generate certificate image
async function generateCertificateImage(participant) {
  if (imageCache.has(participant.id)) {
    return imageCache.get(participant.id);
  }

  const template = await loadImage(TEMPLATE_PATH);
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');

  // Draw base template
  ctx.drawImage(template, 0, 0);

  // Participant name (centered, large white text)
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';

  // Scale font size based on name length
  let fontSize = 48;
  if (participant.name.length > 20) fontSize = 40;
  if (participant.name.length > 30) fontSize = 32;

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillText(participant.name, canvas.width / 2, 340);

  // Date (centered, below name)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '20px sans-serif';
  ctx.fillText(formatDate(participant.date), canvas.width / 2, 420);

  const buffer = canvas.toBuffer('image/png');
  imageCache.set(participant.id, buffer);
  return buffer;
}

// Build LinkedIn "Add to Profile" URL
function buildAddToProfileUrl(participant) {
  const certDate = new Date(participant.date + 'T00:00:00');
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: participant.program || 'AI Opener Certificate',
    organizationName: ORG_NAME.replace(/\+/g, ' '),
    issueYear: certDate.getFullYear().toString(),
    issueMonth: (certDate.getMonth() + 1).toString(),
    certUrl: `${BASE_URL}/cert/${participant.id}`,
    certId: participant.id,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

// Build LinkedIn "Share to Feed" URL
function buildShareUrl(participant) {
  const params = new URLSearchParams({
    url: `${BASE_URL}/cert/${participant.id}`,
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

// Routes

// GET / — Index page
app.get('/', (req, res) => {
  const participants = loadParticipants();
  const recentHtml = participants.slice(-10).reverse().map(p =>
    `<li><a href="/cert/${p.id}">${p.name}</a> — ${formatDate(p.date)}</li>`
  ).join('\n');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Opener Certificates</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 600px; padding: 40px; text-align: center; }
    h1 { color: #e2b857; margin-bottom: 8px; font-size: 2rem; }
    p { color: rgba(255,255,255,0.6); margin-bottom: 32px; }
    ul { list-style: none; text-align: left; }
    li { padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
    a { color: #e2b857; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .empty { color: rgba(255,255,255,0.4); font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <h1>AI Opener Certificates</h1>
    <p>Recent certificates</p>
    ${participants.length > 0
      ? `<ul>${recentHtml}</ul>`
      : '<p class="empty">No certificates yet. Import participants to get started.</p>'
    }
  </div>
</body>
</html>`);
});

// GET /cert/:id/image — Certificate image (PNG)
app.get('/cert/:id/image', async (req, res) => {
  const participant = getParticipant(req.params.id);
  if (!participant) {
    return res.status(404).send('Certificate not found');
  }

  try {
    const imageBuffer = await generateCertificateImage(participant);
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(imageBuffer);
  } catch (err) {
    console.error('Image generation error:', err);
    res.status(500).send('Error generating certificate image');
  }
});

// GET /cert/:id — Certificate page with OG tags + LinkedIn buttons
app.get('/cert/:id', (req, res) => {
  const participant = getParticipant(req.params.id);
  if (!participant) {
    return res.status(404).send(`<!DOCTYPE html>
<html><head><title>Not Found</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#1a1a2e;color:#fff;">
<div style="text-align:center"><h1>Certificate Not Found</h1><p><a href="/" style="color:#e2b857">Back to home</a></p></div>
</body></html>`);
  }

  const certUrl = `${BASE_URL}/cert/${participant.id}`;
  const imageUrl = `${BASE_URL}/cert/${participant.id}/image`;
  const formattedDate = formatDate(participant.date);
  const programName = participant.program || 'AI Opener Certificate';
  const addToProfileUrl = buildAddToProfileUrl(participant);
  const shareUrl = buildShareUrl(participant);

  let template = fs.readFileSync(HTML_TEMPLATE, 'utf8');
  template = template
    .replace(/{{name}}/g, participant.name)
    .replace(/{{date}}/g, formattedDate)
    .replace(/{{program}}/g, programName)
    .replace(/{{certUrl}}/g, certUrl)
    .replace(/{{imageUrl}}/g, imageUrl)
    .replace(/{{certId}}/g, participant.id)
    .replace(/{{addToProfileUrl}}/g, addToProfileUrl)
    .replace(/{{shareUrl}}/g, shareUrl)
    .replace(/{{orgName}}/g, ORG_NAME.replace(/\+/g, ' '));

  res.send(template);
});

app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
});
