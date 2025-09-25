#!/usr/bin/env python3
"""
NER Service for DreamFund - Document Information Extraction
Flask web service that extracts name, CGPA, and program from uploaded documents
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import re
import os
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:5000'])

def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        with fitz.open(file_path) as doc:
            text = ""
            for page in doc:
                text += page.get_text()
        return text
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}")
        return None

def extract_text_from_file(file_path):
    """Extract text from various file formats"""
    file_path = Path(file_path)
    
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        return None
    
    if file_path.suffix.lower() == '.pdf':
        return extract_text_from_pdf(file_path)
    else:
        # Try to read as text file
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading file: {e}")
                return None

def extract_name(text):
    """Extract student name from transcript text"""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    student_name = None
    name_found_at_line = None

    # 1. Look for a line that is exactly 'NAME'
    for i, line in enumerate(lines):
        if line.upper() == 'NAME':
            name_found_at_line = i
            break

    # 2. If 'NAME' found, check the next few lines for a valid name
    if name_found_at_line is not None:
        for j in range(name_found_at_line + 1, min(name_found_at_line + 15, len(lines))):
            candidate_line = lines[j]

            # Skip empty lines
            if not candidate_line:
                continue

            # Keywords to skip
            skip_keywords = [
                'GENDER', 'PROGRAM', 'FACULTY', 'FAKULTI', 'ADDRESS', 'NRIC',
                'PASSPORT', 'STUDENT', 'CITIZENSHIP', 'INTAKE', 'LEVEL', 'RESULTS',
                'MALE', 'FEMALE', 'OGOS', 'AUGUST', 'SESSION', 'COMPLETED', 'FINAL',
                'CGPA', 'TMN', 'JLN', 'JALAN', 'WARGANEGARA'
            ]

            if any(keyword in candidate_line.upper() for keyword in skip_keywords):
                continue

            # Skip IDs, numbers, dates, or addresses
            if (candidate_line.isdigit() or
                '/' in candidate_line or
                (any(char.isdigit() for char in candidate_line) and len(candidate_line.split()) == 1)):
                continue

            # Looks like a name?
            words = candidate_line.split()
            if (2 <= len(words) <= 8 and
                all(word.replace("'", "").replace("-", "").isalpha() for word in words) and
                (not candidate_line.isupper() or (candidate_line.isupper() and len(words) >= 2))):
                return candidate_line.strip(), 0.9

    # 3. Fallback: use regex patterns if line-based method failed
    name_patterns = [
        r'NAME[^A-Z]*?([A-Z][A-Z\s\'\-]+?)(?=\s+(?:NRIC|STUDENT|PROGRAM|GENDER|FAKULTI|FACULTY))',
        r'NAME\s+([A-Z][A-Z\s\'\-]+?)(?=\s+(?:GENDER|PROGRAM|NRIC|STUDENT))',
        r'(?:Name|Student Name|Full Name)\s*:?\s*([A-Z][a-zA-Z\'\-]+(?:\s+[A-Z][a-zA-Z\'\-]+)+)',
    ]

    for pattern in name_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name_candidate = match.group(1).strip()
            words = name_candidate.split()
            if (2 <= len(words) <= 6 and
                all(word.replace("'", "").replace("-", "").isalpha() for word in words)):
                return name_candidate, 0.8

    return None, 0.0

def extract_cgpa(text):
    """Extract CGPA from text"""
    # Look for CGPA patterns
    cgpa_patterns = [
        r'Final\s+CGPA\s*:?\s*(\d+\.\d+)'
    ]
    
    for pattern in cgpa_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            cgpa = float(match)
            if 0.0 <= cgpa <= 4.0:
                return match, 0.9
    
    # Look for any decimal number that could be CGPA
    decimal_pattern = r'\b(\d+\.\d+)\b'
    matches = re.findall(decimal_pattern, text)
    for match in matches:
        cgpa = float(match)
        if 2.0 <= cgpa <= 4.0:  # Reasonable CGPA range
            return match, 0.6
    
    return None, 0.0

def extract_program(text):
    """Extract program/course from transcript text"""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    # 1. Look for line with DIPLOMA or DEGREE and extract it
    for line in lines:
        if 'DIPLOMA' in line.upper() or 'DEGREE' in line.upper():
            # Remove unwanted prefixes
            if line.upper().startswith('PROGRAM'):
                line = re.sub(r'^PROGRAM\s*', '', line, flags=re.IGNORECASE).strip()
            
            # If line has more than just "DIPLOMA"
            words = line.split()
            if len(words) > 1:
                return line.strip(), 0.8
    
    # 2. Fallback: Look for PROGRAM in a line
    for i, line in enumerate(lines):
        prog_in_line = re.search(r'PROGRAM\s+(.+)', line, re.IGNORECASE)
        if prog_in_line:
            return prog_in_line.group(1).strip(), 0.75
        
        # Check next few lines if line says "PROGRAM"
        if 'PROGRAM' in line.upper():
            for j in range(i + 1, min(i + 3, len(lines))):
                next_line = lines[j]
                if 'DIPLOMA' in next_line.upper() or 'DEGREE' in next_line.upper():
                    return next_line.strip(), 0.75
    
    # 3. Fallback: Use keyword search
    common_programs = [
        'Computer Science', 'Engineering', 'Business Administration',
        'Information Technology', 'Software Engineering', 'Data Science',
        'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering'
    ]
    
    for program in common_programs:
        if program.lower() in text.lower():
            return program, 0.7

    return None, 0.0

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'Python extraction service is running',
        'service': 'ner_service',
        'port': 5001
    })

@app.route('/api/extract', methods=['POST'])
def extract_information():
    """Extract information from uploaded document"""
    try:
        data = request.get_json()
        
        if not data or 'filePath' not in data:
            return jsonify({
                'error': 'Missing file path',
                'name': None,
                'cgpa': None,
                'program': None,
                'confidence': {'name': 0.0, 'cgpa': 0.0, 'program': 0.0}
            }), 400
        
        file_path = data['filePath']
        file_name = data.get('fileName', 'unknown')
        
        logger.info(f"Processing file: {file_name} at {file_path}")
        
        # Extract text from file
        text = extract_text_from_file(file_path)
        
        if not text:
            return jsonify({
                'error': 'Could not extract text from file',
                'name': None,
                'cgpa': None,
                'program': None,
                'confidence': {'name': 0.0, 'cgpa': 0.0, 'program': 0.0}
            }), 400
        
        logger.info(f"Extracted {len(text)} characters from {file_name}")
        
        # Extract information
        name, name_confidence = extract_name(text)
        cgpa, cgpa_confidence = extract_cgpa(text)
        program, program_confidence = extract_program(text)
        
        result = {
            'name': name,
            'cgpa': cgpa,
            'program': program,
            'confidence': {
                'name': name_confidence,
                'cgpa': cgpa_confidence,
                'program': program_confidence
            },
            'fileName': file_name,
            'textLength': len(text)
        }
        
        logger.info(f"Extraction results: {result}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        return jsonify({
            'error': f'Extraction failed: {str(e)}',
            'name': None,
            'cgpa': None,
            'program': None,
            'confidence': {'name': 0.0, 'cgpa': 0.0, 'program': 0.0}
        }), 500

if __name__ == '__main__':
    print("🐍 Starting Python Extraction Service...")
    print("📋 Service Details:")
    print("   - Port: 5001")
    print("   - Health Check: http://localhost:5001/health")
    print("   - Extract API: http://localhost:5001/api/extract")
    print("   - CORS: Enabled for localhost:3000, localhost:5000")
    print("")
    
    app.run(host='::', port=5001, debug=True)