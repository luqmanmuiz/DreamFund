#!/bin/bash

echo "🛑 Stopping DreamFund Platform Services..."

# Function to kill process by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🔄 Stopping $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null
            sleep 2
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
        fi
        rm -f "$pid_file"
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    echo "🔄 Stopping $service_name on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# Stop services by PID files first
kill_by_pid_file ".backend.pid" "Node.js Backend"
kill_by_pid_file ".python.pid" "Python Extraction Service"
kill_by_pid_file ".frontend.pid" "React Frontend"

# Fallback: kill by ports
kill_port 5000 "Node.js Backend"
kill_port 5001 "Python Extraction Service"
kill_port 3000 "React Frontend"

# Clean up any remaining processes
pkill -f "node.*server" 2>/dev/null || true
pkill -f "python.*ner_service" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true

echo "✅ All services stopped successfully!"
echo ""
echo "🔍 To verify all processes are stopped:"
echo "   - Check ports: lsof -i :3000,5000,5001"
echo "   - Check processes: ps aux | grep -E '(node|python|npm)'"
