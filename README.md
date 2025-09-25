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
- Word documents (.doc, .docx)
- Images (.jpg, .jpeg, .png, .gif)

The AI can understand:
- Student names
- GPAs and CGPAs
- What you're studying (your academic program)
- Both Malaysian and international transcripts
- Documents in English or Malay

## Fixing Common Problems

1. **"Port already in use" error**
   - Close any other applications that might be using ports 3000, 5000, or 5001
   - Or restart your computer

2. **Python packages not working**
   Try this:
   ```bash
   cd extraction-service
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```

3. **Node.js errors**
   Try this:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **AI service not working**
   - Make sure the Python service is running
   - Check that you installed all Python packages
   - Make sure all file paths are correct

## Getting Help

If you need help:
1. Look at the error messages in your terminal
2. Check your browser's console for errors (press F12 to open)
3. Create an issue on GitHub
4. Check the troubleshooting steps above

## License

This project is available under the MIT License - see the LICENSE file for details.

---

**Remember**: All three parts of the project (website, backend, and AI service) need to be running for everything to work properly.

## Project Structure

\`\`\`
dreamfund-platform/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── package.json
├── extraction-service/     # Python AI service
│   ├── ner_service.py
│   └── requirements.txt
├── app/                   # Next.js API routes
│   └── api/
├── start-services.sh      # Startup script
├── stop-services.sh       # Shutdown script
└── README.md
\`\`\`

## Environment Variables

Create `.env` files in the respective directories:

### Server (.env)
\`\`\`
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dreamfund
JWT_SECRET=your-jwt-secret
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
\`\`\`

### Client (.env)
\`\`\`
REACT_APP_API_URL=http://localhost:5000
REACT_APP_EXTRACTION_URL=http://localhost:5001
\`\`\`

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   \`\`\`bash
   # Kill processes on specific ports
   lsof -ti:3000 | xargs kill -9  # React
   lsof -ti:5000 | xargs kill -9  # Node.js
   lsof -ti:5001 | xargs kill -9  # Python
   \`\`\`

2. **Python Dependencies Missing**
   \`\`\`bash
   cd extraction-service
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   \`\`\`

3. **Node Modules Issues**
   \`\`\`bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   \`\`\`

4. **Extraction Service Not Working**
   - Ensure Python service is running on port 5001
   - Check that spaCy model is downloaded
   - Verify file paths are correct

### Logs and Debugging

- Check browser console for frontend errors
- Monitor terminal output for backend logs
- Python service logs show extraction details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Note**: Make sure all services are running before testing the upload and extraction functionality.
