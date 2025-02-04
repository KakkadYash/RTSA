CREATE DATABASE sports_analytics;
USE sports_analytics;
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);
CREATE TABLE Videos (
    video_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
CREATE TABLE Analytics (
    analytics_id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL,
    ideal_head_angle_percentage FLOAT NOT NULL,
    top_speed FLOAT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES Videos(video_id)
);

SELECT * FROM Users;
SELECT COUNT(*) AS total_videos 
FROM Videos 
WHERE user_id = 1;
SELECT AVG(ideal_head_angle_percentage) AS average_angle 
FROM Analytics
WHERE video_id IN (SELECT video_id FROM Videos WHERE user_id = 1);
SELECT AVG(top_speed) AS average_speed FROM Analytics;

USE sports_analytics;

-- Verify structure of Users table
DESCRIBE Users;

-- Verify structure of Videos table
DESCRIBE Videos;

-- Verify structure of Analytics table
DESCRIBE Analytics;

-- Confirm tables are empty (before testing)
SELECT * FROM Users;
SELECT * FROM Videos;
SELECT * FROM Analytics;

SET FOREIGN_KEY_CHECKS = 0; -- Disable foreign key checks temporarily
TRUNCATE TABLE analytics;
TRUNCATE TABLE users;
TRUNCATE TABLE videos;
SET FOREIGN_KEY_CHECKS = 1; -- Re-enable foreign key checks

ALTER TABLE Users ADD username VARCHAR(100) UNIQUE NOT NULL;
SELECT username, password FROM Users;
