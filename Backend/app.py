from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import pickle
import tensorflow as tf
from tensorflow.keras.models import load_model
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# ✅ FIX: Define path to Model folder
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'Model')

# Load model and encoders from Model folder
print("Loading model and encoders...")
model = load_model(os.path.join(MODEL_DIR, 'movie_recommender_model.keras'))

with open(os.path.join(MODEL_DIR, 'user_encoder.pkl'), 'rb') as f:
    user_encoder = pickle.load(f)

with open(os.path.join(MODEL_DIR, 'movie_encoder.pkl'), 'rb') as f:
    movie_encoder = pickle.load(f)

with open(os.path.join(MODEL_DIR, 'genre_columns.pkl'), 'rb') as f:
    genre_columns = pickle.load(f)

movies_data = pd.read_pickle(os.path.join(MODEL_DIR, 'movies_data.pkl'))

print("Model and encoders loaded successfully!")


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Backend is running'}), 200


@app.route('/api/movies', methods=['GET'])
def get_movies():
    """Get list of all movies"""
    try:
        movies_list = movies_data[['movieId', 'title', 'genres']].to_dict('records')
        # Convert genre list back to string for frontend
        for movie in movies_list:
            if isinstance(movie['genres'], list):
                movie['genres'] = '|'.join(movie['genres'])
        return jsonify({'movies': movies_list}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/predict', methods=['POST'])
def predict_rating():
    """Predict rating for a user-movie pair"""
    try:
        data = request.json
        user_id = data.get('userId')
        movie_id = data.get('movieId')
        
        if user_id is None or movie_id is None:
            return jsonify({'error': 'userId and movieId are required'}), 400
        
        # Check if user exists in encoder
        if user_id not in user_encoder.classes_:
            return jsonify({'error': f'User ID {user_id} not found in training data'}), 404
        
        # Check if movie exists in encoder
        if movie_id not in movie_encoder.classes_:
            return jsonify({'error': f'Movie ID {movie_id} not found in training data'}), 404
        
        # Encode user and movie
        user_idx = user_encoder.transform([user_id])[0]
        movie_idx = movie_encoder.transform([movie_id])[0]
        
        # Get genre vector
        genre_vector = movies_data.loc[movies_data['movieId'] == movie_id, genre_columns].values
        
        if len(genre_vector) == 0:
            return jsonify({'error': f'Movie ID {movie_id} not found in movies data'}), 404
        
        # Prepare inputs
        user_array = np.array([[user_idx]])
        movie_array = np.array([[movie_idx]])
        genre_array = genre_vector
        
        # Predict
        rating_pred = model.predict([user_array, movie_array, genre_array], verbose=0)
        predicted_rating = float(rating_pred[0][0])
        
        # Get movie details
        movie_info = movies_data.loc[movies_data['movieId'] == movie_id, ['title', 'genres']].iloc[0]
        
        return jsonify({
            'userId': int(user_id),
            'movieId': int(movie_id),
            'movieTitle': movie_info['title'],
            'genres': '|'.join(movie_info['genres']) if isinstance(movie_info['genres'], list) else movie_info['genres'],
            'predictedRating': round(predicted_rating, 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/recommend', methods=['POST'])
def recommend_movies():
    """Get top N movie recommendations for a user"""
    try:
        data = request.json
        user_id = data.get('userId')
        top_n = data.get('topN', 10)
        
        if user_id is None:
            return jsonify({'error': 'userId is required'}), 400
        
        # Check if user exists
        if user_id not in user_encoder.classes_:
            return jsonify({'error': f'User ID {user_id} not found in training data'}), 404
        
        user_idx = user_encoder.transform([user_id])[0]
        
        # Get all movies
        all_movie_ids = movies_data['movieId'].values
        predictions = []
        
        for movie_id in all_movie_ids:
            if movie_id in movie_encoder.classes_:
                movie_idx = movie_encoder.transform([movie_id])[0]
                genre_vector = movies_data.loc[movies_data['movieId'] == movie_id, genre_columns].values
                
                user_array = np.array([[user_idx]])
                movie_array = np.array([[movie_idx]])
                genre_array = genre_vector
                
                rating_pred = model.predict([user_array, movie_array, genre_array], verbose=0)
                predictions.append({
                    'movieId': int(movie_id),
                    'title': movies_data.loc[movies_data['movieId'] == movie_id, 'title'].values[0],
                    'genres': '|'.join(movies_data.loc[movies_data['movieId'] == movie_id, 'genres'].values[0]),
                    'predictedRating': float(rating_pred[0][0])
                })
        
        # Sort by predicted rating and get top N
        predictions.sort(key=lambda x: x['predictedRating'], reverse=True)
        top_recommendations = predictions[:top_n]
        
        return jsonify({
            'userId': int(user_id),
            'recommendations': top_recommendations
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/users', methods=['GET'])
def get_users():
    """Get list of all user IDs"""
    try:
        user_ids = user_encoder.classes_.tolist()
        return jsonify({'userIds': user_ids}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
