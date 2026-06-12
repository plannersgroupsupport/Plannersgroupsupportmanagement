const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://fdhethe6kbwjapax.public.blob.vercel-storage.com/1775655390394-51357-Picsart-BackgroundRemover.jpg';

const files = [
  path.join(__dirname, 'src/app/icon.jpg'),
  path.join(__dirname, 'public/icon-192x192.png'),
  path.join(__dirname, 'public/icon-512x512.png')
];

https.get(url, (response) => {
  if (response.statusCode === 200) {
    
    // We will just write the JPG data directly.
    // Most browsers/PWAs can actually handle a JPG pretending to be a PNG, 
    // but ideally we just change manifest.json to point to jpg.
    // To be safe without sharp, we just copy the raw bits.
    
    // First let's remove the old favicon.ico
    try {
      fs.unlinkSync(path.join(__dirname, 'src/app/favicon.ico'));
    } catch(e) {}
    
    let imageStream = [];
    response.on('data', chunk => imageStream.push(chunk));
    response.on('end', () => {
      const buffer = Buffer.concat(imageStream);
      files.forEach(file => {
        fs.writeFileSync(file, buffer);
        console.log('Saved to', file);
      });
    });
  } else {
    console.error(`Failed to download image. Status Code: ${response.statusCode}`);
  }
}).on('error', (err) => {
  console.error(`Error downloading image: ${err.message}`);
});
