# Zoom Meeting Manager

A comprehensive Next.js application for managing Zoom meetings with intelligent audio streaming through bots.

## Features

### Admin Dashboard
- Create and manage Zoom meetings
- Assign meetings to subscribers
- Monitor bot activity and audio streaming
- Real-time meeting status updates
- Subscriber management

### Subscriber Portal
- Email-based authentication
- Listen to assigned meetings through audio streams
- Real-time audio streaming with quality controls
- Meeting history and recordings
- Live meeting notifications

### Audio Streaming System
- Intelligent bots that join Zoom meetings
- Real-time audio capture and streaming
- High-quality audio with minimal latency
- Stream monitoring and quality metrics
- WebRTC-based audio streaming

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Video**: Zoom API integration
- **Audio**: Web Audio API, MediaRecorder API
- **Deployment**: Vercel

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCSPl7r--KFIuzBD7EJJ3UwshJKZLk2_34
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=zoom-bot-a7d54.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=zoom-bot-a7d54
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=zoom-bot-a7d54.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=564239089518
NEXT_PUBLIC_FIREBASE_APP_ID=1:564239089518:web:81a9003d0b063a6cd9cb7f
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-RLJ4HY3CJH

# Zoom API Configuration
ZOOM_ACCOUNT_ID=nWeUJXoTSbaWJ7H4E83wXA
ZOOM_CLIENT_ID=_ajXCNqORDKH1H8jOsQUdQ
ZOOM_CLIENT_SECRET=G2WdPU2HKOtMz5ypF294sgYwqq2obNb2
\`\`\`

### 2. Installation

\`\`\`bash
npm install
\`\`\`

### 3. Development

\`\`\`bash
npm run dev
\`\`\`

### 4. Deployment

Deploy to Vercel:

\`\`\`bash
vercel --prod
\`\`\`

## Usage

### For Admins

1. Navigate to `/admin`
2. Create subscribers by clicking "Add Subscriber"
3. Create Zoom meetings and assign them to subscribers
4. Monitor bot activity and audio streaming status
5. Manage meeting lifecycle (scheduled → live → ended)

### For Subscribers

1. Navigate to `/subscriber`
2. Enter your registered email address
3. View assigned meetings in different tabs:
   - **Live**: Currently active meetings with audio streaming
   - **Scheduled**: Upcoming meetings
   - **History**: Past meetings with recordings
4. Click "Start Listening" to connect to live audio streams

## Architecture

### Bot System
- Bots automatically join Zoom meetings when they start
- Audio is captured using Web Audio API
- Real-time streaming to assigned subscribers
- Quality monitoring and adaptive bitrate

### Database Schema
- **subscribers**: User information and status
- **meetings**: Zoom meeting details and assignments
- **streams**: Active audio stream information

### API Routes
- `/api/bot`: Bot management and status
- `/api/stream`: Audio streaming control
- `/api/webhook/zoom`: Zoom webhook handling

## Security Features

- Firebase authentication and authorization
- Row-level security for data access
- Secure API endpoints with validation
- CORS protection for audio streams
- Environment variable protection

## Performance Optimizations

- Client-side caching with SWR
- Optimized audio streaming with minimal latency
- Real-time updates using Firebase listeners
- Responsive design for all devices
- Progressive Web App capabilities

## Support

For issues or questions, please check the documentation or contact support.
