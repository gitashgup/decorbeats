// Run with the workspace's bundled Sharp available through NODE_PATH.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
async function main() {
  const logo = await sharp(path.join(root, 'public/assets/brand/decorbeats-logo.svg')).resize(244,244).png().toBuffer();
  const artwork = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#163c36"/>
    <rect x="28" y="28" width="1144" height="574" rx="12" fill="none" stroke="#bb9864" stroke-width="2"/>
    <path d="M400 188v254" stroke="#bb9864" stroke-width="2"/>
    <text x="452" y="270" font-family="Georgia,serif" font-size="84" fill="#fff7e9">Decorbeats</text>
    <text x="456" y="333" font-family="Arial,sans-serif" font-size="26" fill="#e7d0aa">BRASS HANDICRAFTS</text>
    <text x="456" y="376" font-family="Arial,sans-serif" font-size="26" fill="#e7d0aa">HOME DÉCOR &amp; GIFTS</text>
    <text x="456" y="437" font-family="Arial,sans-serif" font-size="27" fill="#fff7e9">www.decorbeats.com</text>
  </svg>`);
  const output = path.join(root,'public/assets/brand/decorbeats-share-v1.jpg');
  await sharp(artwork).composite([{input:logo,left:100,top:193}]).jpeg({quality:88,mozjpeg:true}).toFile(output);
  console.log(JSON.stringify({output,bytes:fs.statSync(output).size}));
}
main().catch(error=>{console.error(error);process.exit(1);});
