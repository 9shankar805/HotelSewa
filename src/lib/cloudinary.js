const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload image
const uploadImage = async (file, folder = 'hotels') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder,
      resource_type: 'auto'
    });
    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    throw new Error('Image upload failed: ' + error.message);
  }
};

// Delete image
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Image deletion failed:', error.message);
  }
};

// Update image (delete old, upload new)
const updateImage = async (oldPublicId, newFile, folder = 'hotels') => {
  try {
    // Delete old image
    if (oldPublicId) {
      await deleteImage(oldPublicId);
    }
    // Upload new image
    return await uploadImage(newFile, folder);
  } catch (error) {
    throw new Error('Image update failed: ' + error.message);
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  updateImage
};
