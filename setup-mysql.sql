-- MySQL Database Setup Script for OYO Hotel Booking System
-- Run this script to create the database

-- Create database
CREATE DATABASE IF NOT EXISTS oyo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE oyo_db;

-- Create user (optional - for production)
-- CREATE USER IF NOT EXISTS 'oyo_user'@'localhost' IDENTIFIED BY 'secure_password';
-- GRANT ALL PRIVILEGES ON oyo_db.* TO 'oyo_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Show databases
SHOW DATABASES;

-- Verify database is created
SELECT 'Database oyo_db created successfully!' AS Status;
