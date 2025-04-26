CREATE DATABASE sports_analytics;
USE sports_analytics;
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    age INT,
    state VARCHAR(255),
    sports VARCHAR(255)
);

CREATE TABLE Videos (
    video_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    video_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    thumbnail_path VARCHAR(255) DEFAULT '',
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Analytics (
    analytics_id INT AUTO_INCREMENT PRIMARY KEY,
    video_id INT NOT NULL,
    user_id INT NOT NULL,
    ideal_head_angle_percentage FLOAT NOT NULL,
    top_speed FLOAT NOT NULL,
    athletic_score INT NOT NULL,
    Jump_Height FLOAT NULL,
    Stride_Length FLOAT NULL,
    peak_acc FLOAT NULL,
	peak_dec FLOAT NULL,
    FOREIGN KEY (video_id) REFERENCES Videos(video_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS Analytics;
DROP TABLE IF EXISTS Videos;
DROP TABLE IF EXISTS Users;

DELETE FROM Videos
WHERE video_id = '2';

SELECT * FROM Users;
SELECT COUNT(*) AS total_videos 
FROM Videos 
WHERE user_id = 1;
SELECT AVG(ideal_head_angle_percentage) AS average_angle 
FROM Analytics
WHERE video_id IN (SELECT video_id FROM Videos WHERE user_id = 1);
SELECT AVG(top_speed) AS average_speed FROM Analytics;

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

