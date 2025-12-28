# DreamFund

A scholarship matching platform that uses AI to extract student information from academic transcripts and automatically match them with relevant scholarships.

## Overview

DreamFund helps students find scholarships that match their academic profile. The platform uses a custom-trained Named Entity Recognition (NER) model to read and extract information from academic documents, then matches students with eligible scholarships from a curated database.

### Key Features

- AI-powered document extraction using custom NER model
- Automatic scholarship matching based on student profiles
- Admin dashboard for scholarship management
- Real-time web scraping for scholarship data
- Click tracking and analytics
- Confidence scoring for extracted data

## Architecture

The platform consists of three main services:

1. **Frontend (React)** - User interface and admin dashboard (Port 3000)
2. **Backend (Node.js/Express)** - API server, database operations, and business logic (Port 5000)
3. **Extraction Service (Python/Flask)** - NER model for document processing (Port 5001)

## Prerequisites

- Node.js v14 or higher
- Python 3.8 or higher
- MongoDB (local or remote instance)
- npm or yarn package manager
- pip (Python package manager)

## Installation

### 1. Clone the Repository

git clone <repository-url>
cd DreamFund### 2. Install Node.js Dependencies

Install dependencies for both client and server:

cd client
npm install
cd ../server
npm install
cd ..### 3. Install Python Dependencies

cd extraction-service
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cd ..### 4. Set Up MongoDB

Ensure MongoDB is running locally on `mongodb://localhost:27017` or have a remote MongoDB URI ready.

## Configuration

### Server Environment Variables

Create a `.env` file in the `server` directory:

PORT=5000
MONGODB_URI=mongodb://localhost:27017/dreamfund
JWT_SECRET=your-secure-jwt-secret-key
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760### Client Environment Variables

Create a `.env` file in the `client` directory:

REACT_APP_API_URL=http://localhost:5000
REACT_APP_EXTRACTION_URL=http://localhost:5001## Running the Application

### Automated Start

Open three separate terminal windows:

**Terminal 1 - Backend Server:**
cd server
npm start
**Terminal 2 - Extraction Service:**
cd extraction-service
python ner_service.py
**Terminal 3 - Frontend:**
cd client
npm start
The application will automatically open at http://localhost:3000

## Admin Setup

### Create Admin User

After starting the backend server, run the seed script to create the default admin user:

cd server
npm run seed### Admin Credentials

- Email: `admin@dreamfund.com`
- Password: `admin123`

### Access Admin Dashboard

Navigate to http://localhost:3000/admin/login

## Features

### For Students

- Upload academic transcripts (PDF format)
- AI extraction of name, CGPA, and program
- View confidence scores for extracted data
- Get matched scholarships based on profile

### For Administrators

- Scrape scholarships from external sources
- Manage scholarship database (CRUD operations)
- View scraping statistics and success rates
- Track user analytics and click-through rates
- Generate reports and insights

## Document Processing

### Extracted Information

The NER model extracts the following data with confidence scores:

- **Student Name** - Full name as appears on transcript
- **CGPA** - Cumulative Grade Point Average
- **Program** - Academic program or field of study

### Confidence Scoring

- **High Confidence** (85%+) - Data extracted with high accuracy
- **Medium Confidence** (65-84%) - Data may need verification
- **Low Confidence** (<65%) - Manual verification recommended

## Technology Stack

### Frontend

- React 18.2.0
- React Router 6.11.0
- Axios for HTTP requests
- Tailwind CSS for styling
- Recharts for data visualization
- React Icons

### Backend

- Node.js with Express 4.18.2
- MongoDB with Mongoose 7.5.0
- JWT for authentication
- Bcrypt for password hashing
- Multer for file uploads
- Cheerio for web scraping
- Axios for HTTP requests

### Extraction Service

- Python 3.8+
- Flask 3.0.0
- spaCy 3.7.2 with custom NER model
- PyMuPDF 1.26.5 for PDF processing
- NumPy for data processing
