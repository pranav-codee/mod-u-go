# MOD-U-GO - Online Examination Platform

An online examination platform with a Node.js backend and React + Vite frontend. The platform includes Firebase authentication, exam scheduling, multiple question types, and anti-cheating features.

## Features

### For Students
- **Take Exams**: Access scheduled exams and submit answers
- **Multiple Question Types**: Support for MCQs, short answers, and fill-in-the-blank questions
- **Anti-Cheating Measures**:
  - Enforced fullscreen mode during exams
  - Tab switching detection and tracking
  - Violations are recorded and reported to teachers
- **View Submissions**: Check past exam submissions and scores
- **Automatic Grading**: Instant scoring based on correct answers

### For Teachers
- **Create and Schedule Exams**: Design exams with custom questions
- **Question Types**: Add MCQs, short answer, and fill-in-the-blank questions
- **Manage Exams**: Edit, update, or delete exams
- **View Submissions**: See all student submissions with scores
- **Track Violations**: Monitor tab switches and fullscreen exits

## Tech Stack

### Backend
- **Node.js** with Express
- **MongoDB** for database
- **Firebase Admin SDK** for authentication
- **Mongoose** for data modeling

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **Firebase SDK** for authentication
- **Axios** for API calls

## Project Structure

```
MOD-U-GO/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB configuration
│   │   └── firebase.js        # Firebase Admin setup
│   ├── models/
│   │   ├── User.js            # User schema
│   │   ├── Exam.js            # Exam schema
│   │   └── Submission.js      # Submission schema
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── exams.js           # Exam CRUD routes
│   │   └── submissions.js     # Submission routes
│   ├── middleware/
│   │   └── auth.js            # Firebase token verification
│   ├── server.js              # Express server
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── config/
    │   │   └── firebase.js    # Firebase client config
    │   ├── contexts/
    │   │   └── AuthContext.jsx # Auth state management
    │   ├── services/
    │   │   └── examService.js  # API service layer
    │   ├── pages/
    │   │   ├── Login.jsx       # Login page
    │   │   ├── Signup.jsx      # Signup page
    │   │   ├── Dashboard.jsx   # Main dashboard
    │   │   ├── CreateExam.jsx  # Exam creation form
    │   │   ├── TakeExam.jsx    # Exam taking interface
    │   │   └── MySubmissions.jsx # Student submissions
    │   ├── App.jsx             # Main app component
    │   └── main.jsx            # Entry point
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Firebase project with Authentication enabled

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mod-u-go
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

5. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:5000/api
```

5. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication with Email/Password provider
4. Get your Firebase configuration:
   - For frontend: Project Settings → General → Your apps
   - For backend: Project Settings → Service Accounts → Generate new private key

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register/login user
- `GET /api/auth/me` - Get current user profile

### Exams
- `POST /api/exams` - Create exam (teacher only)
- `GET /api/exams` - Get all exams (filtered by role)
- `GET /api/exams/:id` - Get exam by ID
- `PUT /api/exams/:id` - Update exam (teacher only)
- `DELETE /api/exams/:id` - Delete exam (teacher only)

### Submissions
- `POST /api/submissions` - Submit exam (student only)
- `GET /api/submissions/exam/:examId` - Get submissions for exam (teacher only)
- `GET /api/submissions/my-submissions` - Get student's submissions

## Usage Guide

### For Teachers

1. **Sign Up** as a teacher
2. **Create an Exam**:
   - Click "Create New Exam" from dashboard
   - Enter exam details (title, description, schedule, duration)
   - Add questions with correct answers
   - Choose question types: MCQ, Short Answer, or Fill in the Blank
3. **View Submissions**:
   - Click "Submissions" on any exam card
   - See scores, answers, and violation counts

### For Students

1. **Sign Up** as a student
2. **Take an Exam**:
   - Click "Take Exam" on any available exam
   - Grant fullscreen permission when prompted
   - Answer all questions
   - Submit when complete or when time expires
3. **View Results**:
   - Click "View My Submissions" from dashboard
   - See scores and submission details

## Anti-Cheating Features

The platform includes several anti-cheating measures:

1. **Fullscreen Enforcement**:
   - Exams automatically open in fullscreen mode
   - Exits from fullscreen are detected and counted
   - Warnings are shown to students

2. **Tab Switch Detection**:
   - Monitors when students switch away from the exam
   - Tracks and records number of tab switches
   - Uses visibility API and window blur events

3. **Violation Recording**:
   - All violations are stored with submissions
   - Teachers can see violation counts for each student

## Future Enhancements

- AI Proctor Engine with gaze detection and eye tracking
- Video recording during exams
- Question banks and randomization
- Detailed analytics for teachers
- Support for file uploads (for programming questions)
- Live proctoring features
- Plagiarism detection

## Security Considerations

- All API routes are protected with Firebase authentication
- Rate limiting implemented to prevent DDoS attacks:
  - General API: 100 requests per 15 minutes
  - Authentication: 5 requests per 15 minutes
  - Exam submissions: 10 submissions per hour
- Sensitive data (like correct answers) is filtered for students
- Environment variables should never be committed
- Use HTTPS in production
- Firebase Admin SDK updated to latest version (no vulnerabilities)

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.
