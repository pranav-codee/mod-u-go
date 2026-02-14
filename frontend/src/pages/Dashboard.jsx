import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { examService } from "../services/examService";
import "./Dashboard.css";

const Dashboard = () => {
  const { userProfile, logout, getAuthToken } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
    fetchNotifications();
  }, []);

  const fetchExams = async () => {
    try {
      const token = await getAuthToken();
      const data = await examService.getExams(token);
      setExams(data.exams);
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = await getAuthToken();
      const data = await examService.getNotifications(token);
      setNotifications(
        data.notifications?.filter((n) => !n.isRead).slice(0, 5) || [],
      );
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const markNotificationRead = async (notificationId) => {
    try {
      const token = await getAuthToken();
      await examService.markNotificationRead(notificationId, token);
      setNotifications(notifications.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const getExamStatus = (exam) => {
    const now = new Date();
    const scheduledAt = new Date(exam.scheduledAt);
    const endTime = new Date(scheduledAt.getTime() + exam.duration * 60000);

    if (now < scheduledAt) {
      return {
        status: "upcoming",
        label: "Upcoming",
        className: "status-upcoming",
      };
    } else if (now >= scheduledAt && now <= endTime) {
      return {
        status: "active",
        label: "Active Now",
        className: "status-active",
      };
    } else {
      return { status: "ended", label: "Ended", className: "status-ended" };
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>MOD-U-GO</h1>
        <nav className="header-nav">
          <Link to="/dashboard" className="nav-link active">
            Dashboard
          </Link>
          {userProfile?.role === "student" && (
            <Link to="/my-submissions" className="nav-link">
              My Submissions
            </Link>
          )}
          {(userProfile?.role === "teacher" ||
            userProfile?.role === "admin") && (
            <Link to="/create-exam" className="nav-link">
              Create Exam
            </Link>
          )}
          {(userProfile?.role === "proctor" ||
            userProfile?.role === "admin") && (
            <Link to="/proctor" className="nav-link">
              Proctor Dashboard
            </Link>
          )}
          {userProfile?.role === "admin" && (
            <Link to="/admin" className="nav-link">
              Admin Panel
            </Link>
          )}
        </nav>
        <div className="header-actions">
          <span className="user-name">Welcome, {userProfile?.name}</span>
          <span className={`user-role role-${userProfile?.role}`}>
            {userProfile?.role?.toUpperCase()}
          </span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Notifications Banner */}
        {notifications.length > 0 && (
          <div className="notifications-banner">
            <h3>📢 Notifications</h3>
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item priority-${notification.priority}`}
                >
                  <span className="notification-title">
                    {notification.title}
                  </span>
                  <span className="notification-message">
                    {notification.message}
                  </span>
                  <button
                    onClick={() => markNotificationRead(notification._id)}
                    className="btn-dismiss"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dashboard-header-section">
          <h2>
            {userProfile?.role === "teacher"
              ? "My Exams"
              : userProfile?.role === "admin"
                ? "All Exams"
                : userProfile?.role === "proctor"
                  ? "Assigned Exams"
                  : "Available Exams"}
          </h2>
          <div className="header-buttons">
            {(userProfile?.role === "teacher" ||
              userProfile?.role === "admin") && (
              <button
                onClick={() => navigate("/create-exam")}
                className="btn-primary"
              >
                + Create New Exam
              </button>
            )}
            {userProfile?.role === "student" && (
              <button
                onClick={() => navigate("/my-submissions")}
                className="btn-secondary"
              >
                📄 View My Submissions
              </button>
            )}
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="no-exams">
            <div className="no-exams-icon">📝</div>
            <p>
              {userProfile?.role === "teacher"
                ? "No exams created yet. Create your first exam!"
                : "No active exams available at the moment."}
            </p>
            {(userProfile?.role === "teacher" ||
              userProfile?.role === "admin") && (
              <button
                onClick={() => navigate("/create-exam")}
                className="btn-primary"
              >
                Create Your First Exam
              </button>
            )}
          </div>
        ) : (
          <div className="exams-grid">
            {exams.map((exam) => {
              const examStatus = getExamStatus(exam);
              return (
                <div
                  key={exam._id}
                  className={`exam-card ${examStatus.className}`}
                >
                  <div className="exam-card-header">
                    <h3>{exam.title}</h3>
                    <span className={`exam-status ${examStatus.className}`}>
                      {examStatus.label}
                    </span>
                  </div>
                  <p className="exam-description">{exam.description}</p>
                  <div className="exam-details">
                    <div className="detail-item">
                      <span className="detail-icon">📅</span>
                      <span>{new Date(exam.scheduledAt).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">⏱️</span>
                      <span>{exam.duration} minutes</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">❓</span>
                      <span>{exam.questions?.length || 0} questions</span>
                    </div>
                    {exam.settings?.passingScore && (
                      <div className="detail-item">
                        <span className="detail-icon">🎯</span>
                        <span>Passing: {exam.settings.passingScore}%</span>
                      </div>
                    )}
                    {exam.settings?.requireWebcam && (
                      <div className="detail-item">
                        <span className="detail-icon">📹</span>
                        <span>Proctored</span>
                      </div>
                    )}
                  </div>
                  <div className="exam-actions">
                    {userProfile?.role === "teacher" ||
                    userProfile?.role === "admin" ? (
                      <>
                        <button
                          onClick={() => navigate(`/edit-exam/${exam._id}`)}
                          className="btn-secondary"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/exam-submissions/${exam._id}`)
                          }
                          className="btn-secondary"
                        >
                          📊 Submissions
                        </button>
                      </>
                    ) : userProfile?.role === "proctor" ? (
                      <button
                        onClick={() => navigate("/proctor")}
                        className="btn-primary"
                      >
                        👁️ Monitor
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/take-exam/${exam._id}`)}
                        className="btn-primary"
                        disabled={examStatus.status === "ended"}
                      >
                        {examStatus.status === "active"
                          ? "▶️ Take Exam Now"
                          : examStatus.status === "upcoming"
                            ? "🕐 View Details"
                            : "🔒 Exam Ended"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
