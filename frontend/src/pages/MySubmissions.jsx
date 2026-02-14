import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { examService } from '../services/examService';
import './Submissions.css';

const MySubmissions = () => {
  const { getAuthToken } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const token = await getAuthToken();
      const data = await examService.getMySubmissions(token);
      setSubmissions(data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading submissions...</div>;
  }

  return (
    <div className="submissions-page">
      <div className="submissions-header">
        <h1>My Submissions</h1>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          Back to Dashboard
        </button>
      </div>

      <div className="submissions-content">
        {submissions.length === 0 ? (
          <div className="no-data">
            <p>You haven't submitted any exams yet.</p>
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.map((submission) => (
              <div key={submission._id} className="submission-card">
                <div className="submission-header">
                  <h3>{submission.examId?.title || 'Exam'}</h3>
                  <span className="score-badge">Score: {submission.score}</span>
                </div>
                <p className="submission-description">
                  {submission.examId?.description || 'No description'}
                </p>
                <div className="submission-details">
                  <p><strong>Submitted:</strong> {new Date(submission.submittedAt).toLocaleString()}</p>
                  <p><strong>Answers:</strong> {submission.answers.length}</p>
                  <p><strong>Tab Switches:</strong> {submission.tabSwitchCount}</p>
                  <p><strong>Fullscreen Exits:</strong> {submission.fullscreenExitCount}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySubmissions;
