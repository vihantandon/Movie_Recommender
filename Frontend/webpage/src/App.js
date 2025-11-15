import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('predict');
  const [users, setUsers] = useState([]);
  const [movies, setMovies] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMovie, setSelectedMovie] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchMovies();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      setUsers(data.userIds || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchMovies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/movies`);
      const data = await response.json();
      setMovies(data.movies || []);
    } catch (err) {
      console.error('Error fetching movies:', err);
    }
  };

  const handlePredict = async () => {
    if (!selectedUser || !selectedMovie) {
      setError('Please select both user and movie');
      return;
    }

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(selectedUser),
          movieId: parseInt(selectedMovie),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setPrediction(data);
      } else {
        setError(data.error || 'Prediction failed');
      }
    } catch (err) {
      setError('Error connecting to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendations([]);

    try {
      const response = await fetch(`${API_BASE_URL}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: parseInt(selectedUser),
          topN: topN,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setRecommendations(data.recommendations || []);
      } else {
        setError(data.error || 'Recommendation failed');
      }
    } catch (err) {
      setError('Error connecting to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎬 Movie Recommender System</h1>
        <p>Neural Network-Based Rating Prediction</p>
      </header>

      <div className="tab-container">
        <button 
          className={`tab ${activeTab === 'predict' ? 'active' : ''}`}
          onClick={() => setActiveTab('predict')}
        >
          Predict Rating
        </button>
        <button 
          className={`tab ${activeTab === 'recommend' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommend')}
        >
          Get Recommendations
        </button>
      </div>

      <div className="content">
        {activeTab === 'predict' ? (
          <div className="predict-section">
            <h2>Predict Movie Rating</h2>
            
            <div className="form-group">
              <label>Select User ID:</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                className="select-input"
              >
                <option value="">-- Choose User --</option>
                {users.slice(0, 100).map(userId => (
                  <option key={userId} value={userId}>User {userId}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Movie:</label>
              <select 
                value={selectedMovie} 
                onChange={(e) => setSelectedMovie(e.target.value)}
                className="select-input"
              >
                <option value="">-- Choose Movie --</option>
                {movies.slice(0, 500).map(movie => (
                  <option key={movie.movieId} value={movie.movieId}>
                    {movie.title}
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={handlePredict} 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Predicting...' : 'Predict Rating'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {prediction && (
              <div className="result-card">
                <h3>Prediction Result</h3>
                <div className="result-item">
                  <strong>User ID:</strong> {prediction.userId}
                </div>
                <div className="result-item">
                  <strong>Movie:</strong> {prediction.movieTitle}
                </div>
                <div className="result-item">
                  <strong>Genres:</strong> {prediction.genres}
                </div>
                <div className="result-item rating">
                  <strong>Predicted Rating:</strong> 
                  <span className="rating-value">{prediction.predictedRating} / 5.0</span>
                </div>
                <div className="rating-stars">
                  {'⭐'.repeat(Math.round(prediction.predictedRating))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="recommend-section">
            <h2>Get Movie Recommendations</h2>
            
            <div className="form-group">
              <label>Select User ID:</label>
              <select 
                value={selectedUser} 
                onChange={(e) => setSelectedUser(e.target.value)}
                className="select-input"
              >
                <option value="">-- Choose User --</option>
                {users.slice(0, 100).map(userId => (
                  <option key={userId} value={userId}>User {userId}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Number of Recommendations:</label>
              <input 
                type="number" 
                value={topN} 
                onChange={(e) => setTopN(parseInt(e.target.value))}
                min="1"
                max="50"
                className="number-input"
              />
            </div>

            <button 
              onClick={handleRecommend} 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Generating...' : 'Get Recommendations'}
            </button>

            {error && <div className="error-message">{error}</div>}

            {recommendations.length > 0 && (
              <div className="recommendations-list">
                <h3>Top {recommendations.length} Recommendations</h3>
                {recommendations.map((rec, index) => (
                  <div key={rec.movieId} className="recommendation-card">
                    <div className="rank">#{index + 1}</div>
                    <div className="movie-info">
                      <h4>{rec.title}</h4>
                      <p className="genres">{rec.genres}</p>
                      <div className="rating-info">
                        <span className="rating-value">
                          {rec.predictedRating.toFixed(2)} / 5.0
                        </span>
                        <span className="rating-stars">
                          {'⭐'.repeat(Math.round(rec.predictedRating))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;