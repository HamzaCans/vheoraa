const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const dest = root + '/public';

const dirs = ['images', 'uploads'];
const files = [
  'style.css', 'script.js', 'app.js',
  'favicon.png', 'manifest.json', 'sw.js',
  'cookie-consent.js', 'maintenance.js',
  'gia-report.jpg', 'logistics-service.jpg',
  'restoration-service.jpg', 'workshop.jpg', 'workshop.webp'
];

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

dirs.forEach(dir => {
  const srcPath = path.join(root, dir);
  const destPath = path.join(dest, dir);
  if (fs.existsSync(srcPath) && fs.statSync(srcPath).isDirectory()) {
    copyDir(srcPath, destPath);
  }
});

files.forEach(file => {
  const srcPath = path.join(root, file);
  const destPath = path.join(dest, file);
  if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) {
    fs.copyFileSync(srcPath, destPath);
  }
});

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  entries.forEach(entry => {
    const srcFile = path.join(src, entry.name);
    const destFile = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}
