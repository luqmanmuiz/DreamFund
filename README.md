# DreamFund Platform

Welcome to DreamFund! This is a website that helps students find scholarships that match their profile. It uses AI to read your academic documents and automatically finds scholarships you might be eligible for.

## What Can DreamFund Do?

- 📄 Upload your academic documents (transcripts)
- 🤖 The AI reads these documents to understand your qualifications
- 🎯 Shows you scholarships that match your profile
- 👨‍💼 Has a special dashboard for administrators
- 📊 Tracks how well the platform is helping students

## Parts of the Project

The project has three main parts that work together:
1. A website that you see in your browser (runs on port 3000)
2. A backend server that handles all the data (runs on port 5000)
3. An AI service that reads your documents (runs on port 5001)

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- npm or yarn
- pip

## Quick Start

### Option 1: Automated Setup (Recommended)

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd dreamfund-platform
   \`\`\`

2. **Make scripts executable**
   \`\`\`bash
   chmod +x start-services.sh stop-services.sh
   \`\`\`

3. **Start all services**
   \`\`\`bash
   ./start-services.sh
   \`\`\`

   This will:
   - Install all dependencies automatically
   - Start all three services
   - Open the application at http://localhost:3000

4. **Stop all services**
   \`\`\`bash
   ./stop-services.sh
   \`\`\`

### Option 2: Manual Setup

1. **Install all dependencies**
   \`\`\`bash
   npm run install-all
   \`\`\`

2. **Install Python dependencies**
   \`\`\`bash
   cd extraction-service
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   cd ..
   \`\`\`

3. **Start services individually**

   **Terminal 1 - Node.js Backend:**
   \`\`\`bash
   cd server
   npm start
   \`\`\`

   **Terminal 2 - Python Extraction Service:**
   \`\`\`bash
   cd extraction-service
   python ner_service.py
   \`\`\`

   **Terminal 3 - React Frontend:**
   \`\`\`bash
   cd client
   npm start
   \`\`\`

## Where to Find Everything

After starting the project, you can access:
- The main website: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin
- Backend server: http://localhost:5000
- AI service: http://localhost:5001

## Setting Up Environment Variables

You'll need to create two files with settings for the project to work:

1. In the `server` folder, create a file named `.env`:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/dreamfund
   JWT_SECRET=your-jwt-secret
   UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=10485760
   ```

2. In the `client` folder, create a file named `.env`:
   ```
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_EXTRACTION_URL=http://localhost:5001
   ```

## About Files You Can Upload

The system can read these types of files:
- PDF files (.pdf)

The AI can understand:
- Student names
- GPAs and CGPAs
- What you're studying (your academic program)
- Both Malaysian and international transcripts
- Documents in English or Malay

**Remember**: All three parts of the project (website, backend, and AI service) need to be running for everything to work properly.

**Note**: Make sure all services are running before testing the upload and extraction functionality.
