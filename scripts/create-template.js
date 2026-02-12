const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a placeholder certificate template (1200x630px)
const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Background gradient
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#1a1a2e');
gradient.addColorStop(1, '#16213e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Decorative border
ctx.strokeStyle = '#e2b857';
ctx.lineWidth = 4;
ctx.strokeRect(30, 30, width - 60, height - 60);

// Inner border
ctx.strokeStyle = 'rgba(226, 184, 87, 0.3)';
ctx.lineWidth = 1;
ctx.strokeRect(40, 40, width - 80, height - 80);

// Top accent line
ctx.fillStyle = '#e2b857';
ctx.fillRect(100, 80, width - 200, 2);

// "CERTIFICATE" header area text
ctx.fillStyle = 'rgba(226, 184, 87, 0.4)';
ctx.font = '16px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('CERTIFICATE OF COMPLETION', width / 2, 120);

// Program name placeholder
ctx.fillStyle = '#e2b857';
ctx.font = 'bold 36px sans-serif';
ctx.fillText('AI OPENER', width / 2, 200);

// "Awarded to" text
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
ctx.font = '18px sans-serif';
ctx.fillText('AWARDED TO', width / 2, 270);

// Name placeholder area (light line where name will go)
ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(250, 360);
ctx.lineTo(width - 250, 360);
ctx.stroke();

// Date area — left blank; actual date is overlaid by server

// Bottom accent line
ctx.fillStyle = '#e2b857';
ctx.fillRect(100, height - 80, width - 200, 2);

// Organization text
ctx.fillStyle = 'rgba(226, 184, 87, 0.4)';
ctx.font = '14px sans-serif';
ctx.fillText('MILES PARTNERSHIP', width / 2, height - 50);

// Save
const outputPath = path.join(__dirname, '..', 'assets', 'certificate-template.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);
console.log(`Template created: ${outputPath}`);
console.log(`Dimensions: ${width}x${height}`);
