// Helper functions for image handling

/**
 * Convert image URLs from external to local format
 * @param {Array|string} images - Current images (can be array or JSON string)
 * @returns {Array} - Array of image URLs
 */
const parseImages = (images) => {
  if (!images) return [];
  if (typeof images === 'string') {
    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  }
  return Array.isArray(images) ? images : [];
};

/**
 * Add new images to existing images
 * @param {Array|string} existingImages - Current images
 * @param {Array} newImages - New images to add
 * @returns {Array} - Updated images array
 */
const addImages = (existingImages, newImages) => {
  const current = parseImages(existingImages);
  return [...current, ...newImages];
};

/**
 * Remove specific image from images array
 * @param {Array|string} images - Current images
 * @param {string} imageToRemove - Image URL to remove
 * @returns {Array} - Updated images array
 */
const removeImage = (images, imageToRemove) => {
  const current = parseImages(images);
  return current.filter(img => img !== imageToRemove);
};

/**
 * Validate image URL format
 * @param {string} url - Image URL to validate
 * @returns {boolean} - True if valid
 */
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check if it's a local URL or external URL
  const localPattern = /^https?:\/\/localhost:\d+\/uploads\//;
  const externalPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
  
  return localPattern.test(url) || externalPattern.test(url);
};

/**
 * Get image type from URL
 * @param {string} url - Image URL
 * @returns {string} - Image type (hotel, room, user, review, general)
 */
const getImageType = (url) => {
  if (!url) return 'general';
  
  if (url.includes('/uploads/hotels/')) return 'hotel';
  if (url.includes('/uploads/rooms/')) return 'room';
  if (url.includes('/uploads/users/')) return 'user';
  if (url.includes('/uploads/reviews/')) return 'review';
  
  return 'general';
};

module.exports = {
  parseImages,
  addImages,
  removeImage,
  isValidImageUrl,
  getImageType
};
