# DreamFund Platform

An AI-powered scholarship matching platform that helps students find and apply for scholarships based on their academic profiles.

## Features

- 📄 **Document Upload & Processing**: Upload academic transcripts, essays, and recommendation letters
- 🤖 **AI-Powered Extraction**: Automatically extract key information (name, CGPA, program) from documents
- 🎯 **Smart Matching**: Match students with relevant scholarships based on their profiles
- 👨‍💼 **Admin Dashboard**: Manage scholarships, users, and generate reports
- 📊 **Analytics**: Track application success rates and platform usage

## Architecture

The platform consists of three main services:

1. **React Frontend** (Port 3000) - User interface
2. **Node.js Backend** (Port 5000) - API server and file handling
3. **Python Extraction Service** (Port 5001) - AI-powered document processing

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

## Service URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Python Extraction**: http://localhost:5001
- **Admin Dashboard**: http://localhost:3000/admin

## API Endpoints

### File Upload & Processing
- `POST /api/upload` - Upload documents
- `POST /api/extract` - Extract data from documents

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Scholarships
- `GET /api/scholarships` - Get all scholarships
- `POST /api/scholarships` - Create scholarship (admin)
- `PUT /api/scholarships/:id` - Update scholarship (admin)
- `DELETE /api/scholarships/:id` - Delete scholarship (admin)

### Admin
- `GET /api/users` - Get all users (admin)
- `GET /api/reports` - Get platform reports (admin)

## Document Processing

The platform supports the following file formats:
- **PDF** (.pdf)
- **Word Documents** (.doc, .docx)
- **Images** (.jpg, .jpeg, .png, .gif)

### Extracted Information

The AI extraction service identifies:
- **Student Name** - Using NER and pattern matching
- **CGPA/GPA** - Prioritizes "FINAL CGPA" mentions
- **Academic Program** - Degree and field of study

### Supported Academic Formats

- Malaysian academic transcripts
- International transcripts
- Bilingual documents (English/Malay)

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
