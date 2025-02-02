from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from tensorflow import keras
import mediapipe as mp
import os

app = Flask(__name__)
CORS(app)

# Load the ML model
model = keras.models.load_model('"C:\ReactionTech\Web Based SA\working\HML\height_estimation_model.h5"')

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
            return jsonify({"error": "No valid landmarks detected."}), 400

        mean_landmarks = np.mean(valid_landmarks, axis=0).reshape(1, -1)
        predictions = model.predict(valid_landmarks)
        estimated_height = float(np.mean(predictions))

        return jsonify({'estimated_height': estimated_height})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
