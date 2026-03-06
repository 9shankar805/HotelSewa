const fs = require('fs');

// Read the current upload routes
let uploadRoutes = fs.readFileSync('src/routes/upload.js', 'utf8');

// Fix the room upload to use correct field names
uploadRoutes = uploadRoutes.replace(
  'images: true',
  'price_per_night: true, images: true'
);

// Fix the user avatar update to use correct field name
uploadRoutes = uploadRoutes.replace(
  'avatar: avatarUrl',
  'avatar_url: avatarUrl'
);

// Write the fixed routes back
fs.writeFileSync('src/routes/upload.js', uploadRoutes);

console.log('✅ Upload routes fixed for actual database schema');
