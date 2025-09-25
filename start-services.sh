#!/bin/bash

echo "🚀 Starting DreamFund Platform Services..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo "🔄 Killing existing process on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check and kill existing processes
if check_port 5000; then
    kill_port 5000
fi

if check_port 5001; then
    kill_port 5001
fi

if check_port 3000; then
    kill_port 3000
fi

# Start Node.js backend server (port 5000)
echo "📦 Starting Node.js backend server on port 5000..."
cd server
npm install
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start Python extraction service (port 5001)
echo "🐍 Starting Python extraction service on port 5001..."
cd extraction-service

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Download spaCy model if not exists
python -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null || {
    echo "📦 Downloading spaCy English model..."
    python -m spacy download en_core_web_sm
}

# Start Python service
python ner_service.py &
PYTHON_PID=$!
cd ..

# Wait for Python service to start
sleep 5

# Start React frontend (port 3000)
echo "⚛️ Starting React frontend on port 3000..."
cd client
npm install
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📋 Service Status:"
echo "   - Node.js Backend: http://localhost:5000 (PID: $BACKEND_PID)"
echo "   - Python Extraction: http://localhost:5001 (PID: $PYTHON_PID)"
echo "   - React Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "🔍 Health Checks:"
echo "   - Backend: curl http://localhost:5000/health"
echo "   - Python: curl http://localhost:5001/health"
echo ""
echo "🛑 To stop all services, run: ./stop-services.sh"
echo ""

# Save PIDs for cleanup
echo "$BACKEND_PID" > .backend.pid
echo "$PYTHON_PID" > .python.pid
echo "$FRONTEND_PID" > .frontend.pid

# Wait for user input to keep script running
echo "Press Ctrl+C to stop all services..."
trap 'echo "🛑 Stopping all services..."; kill $BACKEND_PID $PYTHON_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait
