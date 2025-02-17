-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS sports_analytics;
USE sports_analytics;

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,  -- Added username directly in creation
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- Videos Table
CREATE TABLE IF NOT EXISTS Videos (
    video_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- TIMESTAMP is better for performance
    file_path VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Analytics Table
CREATE TABLE IF NOT EXISTS Analytics (
    analytics_id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL,
    ideal_head_angle_percentage FLOAT NOT NULL,
    top_speed FLOAT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES Videos(video_id) ON DELETE CASCADE
);

-- Indexes to speed up queries
CREATE INDEX idx_user_id ON Videos (user_id);
CREATE INDEX idx_video_id ON Analytics (video_id);

-- Sample Queries for Performance & Analytics
SELECT * FROM Users;

-- Get total videos for a user (using optimized indexing)
SELECT COUNT(*) AS total_videos FROM Videos WHERE user_id = 1;

-- Get average head angle percentage for a user's videos
SELECT AVG(a.ideal_head_angle_percentage) AS average_angle 
FROM Analytics a
JOIN Videos v ON a.video_id = v.video_id
WHERE v.user_id = 1;

-- Get overall average top speed
SELECT AVG(top_speed) AS average_speed FROM Analytics;

-- Verify structure of tables
DESCRIBE Users;
DESCRIBE Videos;
DESCRIBE Analytics;

-- Truncate Tables Safely (when necessary)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Analytics;
TRUNCATE TABLE Users;
TRUNCATE TABLE Videos;
SET FOREIGN_KEY_CHECKS = 1;
