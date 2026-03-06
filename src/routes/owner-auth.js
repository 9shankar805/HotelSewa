const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { uploadSingle, getFileUrl } = require('../middleware/upload');

// Login
router.post('/login', async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is an owner
    if (user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only hotel owners can login here.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          verified: user.verified
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Register new owner
router.post('/register', async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new owner
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: 'OWNER',
        verified: false
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          verified: user.verified
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Get owner profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        verified: true,
        avatar: true,
        googleSub: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has hotels
    const hotelCount = await prisma.hotel.count({
      where: { ownerId: user.id }
    });

    res.json({
      success: true,
      data: {
        ...user,
        profileImageUrl: user.avatar,
        hasHotel: hotelCount > 0
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

// Update owner profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        verified: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...user,
        profileImageUrl: user.avatar
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

// Upload profile picture
router.post('/profile/upload-avatar', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: imageUrl },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        verified: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        imageUrl: user.avatar,
        user: {
          ...user,
          profileImageUrl: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
});

// Remove profile picture
router.delete('/profile/avatar', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null }
    });

    res.json({
      success: true,
      message: 'Profile picture removed successfully'
    });
  } catch (error) {
    console.error('Remove avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove profile picture',
      error: error.message
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    // TODO: Implement token blacklisting if needed
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

// Google Sign-In
router.post('/google-signin', async (req, res) => {
  try {
    const { email, name, photoUrl, idToken, accessToken } = req.body;

    console.log('🔵 Google Sign-In attempt:', { email, name });

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      console.log('✅ Existing user found:', user.id);
      // User exists, check if they're an owner
      if (user.role !== 'OWNER') {
        return res.status(403).json({
          success: false,
          message: 'This account is not registered as a hotel owner'
        });
      }
      
      // Update avatar if provided and not already set
      if (photoUrl && !user.avatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatar: photoUrl }
        });
      }
      
      // Update googleSub if provided and not already set
      if (idToken && !user.googleSub) {
        // Extract the sub from the idToken payload
        try {
          const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleSub: payload.sub }
          });
        } catch (e) {
          console.log('Could not parse idToken:', e);
        }
      }
    } else {
      console.log('🆕 Creating new owner account');
      
      // Extract googleSub from idToken if provided
      let googleSubValue = null;
      if (idToken) {
        try {
          const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
          googleSubValue = payload.sub;
        } catch (e) {
          console.log('Could not parse idToken:', e);
        }
      }
      
      // Create new owner account with correct field names
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          phone: '', // Empty phone for Google users
          role: 'OWNER',
          verified: true,
          avatar: photoUrl || null,
          googleSub: googleSubValue
        }
      });
      console.log('✅ New user created:', user.id);
    }

    // Check if user has any hotels
    const hotelCount = await prisma.hotel.count({
      where: { ownerId: user.id }
    });
    const hasHotel = hotelCount > 0;

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('✅ Google Sign-In successful for:', user.email);

    res.json({
      success: true,
      message: 'Google Sign-In successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone || '',
          role: user.role,
          verified: user.verified,
          profileImageUrl: user.avatar, // Map avatar to profileImageUrl for Flutter
          isEmailVerified: user.verified,
          hasHotel: hasHotel,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Google Sign-In error:', error);
    res.status(500).json({
      success: false,
      message: 'Google Sign-In failed',
      error: error.message
    });
  }
});

module.exports = router;
