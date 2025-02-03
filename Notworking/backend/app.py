from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from google.cloud import storage
# import tensorflow as tf
from tensorflow import keras
import pymysql
from dotenv import load_dotenv
import numpy as np
import mediapipe as mp
import traceback
import bcrypt
import os
import cv2

# Initialize Flask app
app = Flask(__name__)
CORS(app)

load_dotenv()

# Load environment variables
app.config['UPLOAD_FOLDER'] = './temp'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.config['GOOGLE_CLOUD_PROJECT'] = 'uploaded-data-443715'
app.config['GOOGLE_CLOUD_KEYFILE'] = r'C:\ReactionTech\WebSA\Notworking\backend\config\uploaded-data-443715-8508d1ea601d.json'
app.config['MYSQL_CONFIG'] = {
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'port': int(os.getenv('DB_PORT', 3306))  # Default MySQL port is 3306
}

if not os.path.exists(app.config['GOOGLE_CLOUD_KEYFILE']):
    print(f"Service account key file not found: {app.config['GOOGLE_CLOUD_KEYFILE']}")
else:
    print(f"Service account key file found: {app.config['GOOGLE_CLOUD_KEYFILE']}")

# MySQL Helper Function
def get_db_connection():
    """Create a new database connection."""
    try:
        connection = pymysql.connect(
            host=app.config['MYSQL_CONFIG']['host'],
            user=app.config['MYSQL_CONFIG']['user'],
            password=app.config['MYSQL_CONFIG']['password'],
            database=app.config['MYSQL_CONFIG']['database'],
            port=app.config['MYSQL_CONFIG']['port'],
            cursorclass=pymysql.cursors.DictCursor  # Return results as dictionaries
        )
        return connection
    except pymysql.MySQLError as e:
        print(f"Error connecting to MySQL: {e}")
        raise


# Initialize Google Cloud Storage
storage_client = storage.Client.from_service_account_json(app.config['GOOGLE_CLOUD_KEYFILE'])
bucket_name = 'video_data_bucket_001'
bucket = storage_client.bucket(bucket_name)

# Load TensorFlow model
height_model = keras.models.load_model('C:\\ReactionTech\\WebSA\\Notworking\\backend\\height_estimation_model.h5')

# Landmark extraction
def extract_landmarks(image):
    mp_pose = mp.solutions.pose
    with mp_pose.Pose() as pose:
        results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        if results.pose_landmarks:
            landmarks = [(lm.x, lm.y, lm.z) for lm in results.pose_landmarks.landmark]
            return np.array(landmarks).flatten()
    return np.zeros(99)

# Additional feature calculation
def calculate_additional_features(landmarks):
    distance_nose_shoulder = np.linalg.norm(landmarks[0:3] - landmarks[3:6])  # 3D distance
    return np.array([distance_nose_shoulder])

# Route to calculate estimated height
@app.route('/estimate_height', methods=['POST'])
def estimate_height():
    file = request.files['video']
    video_path = 'temp_video.mp4'
    file.save(video_path)

    try:
        video_capture = cv2.VideoCapture(video_path)
        all_landmarks = []
        frame_count = 0
        batch_size = 5

        while video_capture.isOpened():
            ret, frame = video_capture.read()
            if not ret:
                break

            if frame_count % batch_size == 0:
                landmarks = extract_landmarks(frame)
                additional_features = calculate_additional_features(landmarks)
                combined_features = np.concatenate((landmarks, additional_features))
                all_landmarks.append(combined_features)

            frame_count += 1

        video_capture.release()
        os.remove(video_path)  # Clean up temporary file

        all_landmarks = np.array(all_landmarks)
        valid_landmarks = all_landmarks[~np.all(all_landmarks == 0, axis=1)]

        if valid_landmarks.size == 0:
            return jsonify({"error": "No valid landmarks detected."}), 1

        mean_landmarks = np.mean(valid_landmarks, axis=0).reshape(1, -1)
        predictions = height_model.predict(valid_landmarks)
        estimated_height = float(np.mean(predictions))

        return jsonify({'estimated_height': estimated_height})

    except Exception as e:
        return jsonify({"error": str(e)}), 2

# Utility Function for Database Queries
def execute_query(query, params=None, fetch=False):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            if fetch:
                return cursor.fetchall()
            else:
                connection.commit()
    finally:
        connection.close()

# Route: Upload video
@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_video():
    if request.method == 'OPTIONS':
        return '', 3

    try:
        file = request.files.get('video')
        user_id = request.form.get('userId')

        if not file or not user_id:
            app.logger.error("Video file or user ID is missing.")
            return jsonify({'error': 'Video file and user ID are required'}), 4

        # Save file locally
        local_file_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
        app.logger.info(f"Saving file to {local_file_path}")
        file.save(local_file_path)

        # Upload video to GCS
        try:
            gcs_video_name = f'videos/{user_id}/{secure_filename(file.filename)}'
            video_blob = bucket.blob(gcs_video_name)
            video_blob.upload_from_filename(local_file_path)
            gcs_url = f'https://storage.googleapis.com/{bucket_name}/{gcs_video_name}'
            app.logger.info(f"Uploaded video to GCS: {gcs_url}"), 5
        except Exception as e:
            app.logger.error(f"GCS upload failed: {e}")
            return jsonify({'error': 'Failed to upload video to cloud storage'}), 6

        # Insert metadata into the database
        try:
            connection = get_db_connection()
            with connection.cursor() as cursor:
                cursor.execute(
                    'INSERT INTO Videos (user_id, video_name, file_path) VALUES (%s, %s, %s)',
                    (user_id, file.filename, gcs_url)
                )
                connection.commit()
                video_id = cursor.lastrowid
                app.logger.info(f"Inserted video metadata into DB with video_id: {video_id}"), 7
        except Exception as e:
            app.logger.error(f"Database operation failed: {e}")
            return jsonify({'error': 'Failed to store video metadata'}), 8
        finally:
            connection.close()

        # # Return success response including video path
        # return jsonify({
        #     'message': 'Video uploaded successfully',
        #     'video_url': gcs_url,
        #     'video_path': local_file_path,  # This is important for height estimation
        #     'video_id': video_id
        # }), 200
    except Exception as e:
        app.logger.error(f"Unexpected error: {traceback.format_exc()}")
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 9


# Signup Route
@app.route('/signup', methods=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS':
        return '', 10  # Handle preflight requests
    data = request.get_json()
    name = data.get('name')
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not (name and username and email and password):
        return jsonify({'error': 'All fields are required'}), 11

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    try:
        execute_query(
            'INSERT INTO users (name, username, email, password) VALUES (%s, %s, %s, %s)',
            (name, username, email, hashed_password.decode('utf-8'))
        )
        return jsonify({'message': 'User registered successfully'}), 12
        return jsonify({'error': 'User already exists'}), 13
    except Exception as e:
        return jsonify({'error': f'Database error: {e}'}), 14

# Login Route
@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 15  # Handle preflight requests
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not (username and password):
        return jsonify({'error': 'Username and password are required'}), 16

    user = execute_query(
        'SELECT * FROM users WHERE username = %s OR email = %s',
        (username, username),
        fetch=True
    )
    if not user:
        return jsonify({'error': 'User not found'}), 17

    user = user[0]
    if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({'error': 'Invalid password'}), 18

    return jsonify({
        'message': 'Login successful',
        'user_id': user['user_id'],
        'username': user['username']
    }), 19

# Route: Save Analytics
@app.route('/saveAnalytics', methods=['POST', 'OPTIONS'])
def save_analytics():
    if request.method == 'OPTIONS':
        return '', 20 
    data = request.get_json()
    video_id = data.get('videoId')
    ideal_head_percentage = data.get('idealHeadPercentage')
    top_speed = data.get('topSpeed')

    if not (video_id and ideal_head_percentage and top_speed):
        return jsonify({'error': 'All fields are required'}), 21

    try:
        execute_query(
            'INSERT INTO Analytics (video_id, ideal_head_angle_percentage, top_speed) VALUES (%s, %s, %s)',
            (video_id, ideal_head_percentage, top_speed)
        )
        return jsonify({'message': 'Analytics saved successfully'}), 22
    except Exception as e:
        return jsonify({'error': f'Failed to save analytics: {str(e)}'}), 23

# Route: History
@app.route('/history', methods=['GET'])
def history():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 24

    try:
        results = execute_query(
            '''
            SELECT video_url, video_name, upload_date, head_percentage, top_speed, thumbnail_url
            FROM Videos
            WHERE user_id = %s
            ORDER BY upload_date DESC
            ''',
            (user_id,),
            fetch=True
        )
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': f'Failed to fetch history: {str(e)}'}), 25

# Route: Profile
@app.route('/profile', methods=['GET'])
def profile():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 26

    try:
        user = execute_query(
            'SELECT name, email, username, age, state, sports FROM users WHERE user_id = %s',
            (user_id,),
            fetch=True
        )
        if not user:
            return jsonify({'error': 'User not found'}), 27
        return jsonify(user[0])
    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 28

# Route: Update Profile
@app.route('/updateProfile', methods=['POST', 'OPTIONS'])
def update_profile():
    if request.method == 'OPTIONS':
        return '', 29   
    data = request.get_json()
    user_id = data.get('userId')
    age = data.get('age')
    state = data.get('state')
    sports = data.get('sports')

    if not (user_id and age and state and sports):
        return jsonify({'error': 'All fields are required'}), 30

    try:
        execute_query(
            'UPDATE users SET age = %s, state = %s, sports = %s WHERE user_id = %s',
            (age, state, ', '.join(sports), user_id)
        )
        return jsonify({'message': 'Profile updated successfully'}), 31
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 32

# Run Flask server
if __name__ == '__main__':
    app.run(debug=True)