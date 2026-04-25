const fs = require('fs');

const [, , filePath, needle, radiusArg] = process.argv;
if (!filePath || !needle) process.exit(1);

const text = fs.readFileSync(filePath, 'utf8');
const lines = text.split(/\r?\n/);
const radius = Number(radiusArg) > 0 ? Number(radiusArg) : 60;

for (let i = 0; i < lines.length; i += 1) {
  if (!lines[i].includes(needle)) continue;
  const start = Math.max(0, i - radius);
  const end = Math.min(lines.length, i + radius + 1);
  console.log(`--- hit @ line ${i + 1} ---`);
  for (let j = start; j < end; j += 1) {
    console.log(`${j + 1}: ${lines[j]}`);
  }
}
