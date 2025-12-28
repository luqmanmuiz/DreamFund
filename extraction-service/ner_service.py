#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    from pypdf import PdfReader
import os
from pathlib import Path
import logging
import spacy
from course_translator import get_translator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:5000'])

# Global NER model
nlp = None

# Global course translator
course_translator = None

def load_custom_ner_model():
    """Load custom trained NER model or fallback to default"""
    global nlp
    
    custom_model_path = "./custom_transcript_ner_model"
    
    try:
        if Path(custom_model_path).exists():
            nlp = spacy.load(custom_model_path)
            logger.info(f"✅ Loaded CUSTOM NER model from {custom_model_path}")
            
            if nlp.get_pipe("ner"):
                labels = nlp.get_pipe("ner").labels
                logger.info(f"   Entity labels: {labels}")
        else:
            logger.warning(f"⚠️  Custom model not found at {custom_model_path}")
            logger.info("   Falling back to en_core_web_sm")
            nlp = spacy.load("en_core_web_sm")
            
    except Exception as e:
        logger.error(f"❌ Error loading model: {e}")
        logger.info("   Falling back to en_core_web_sm")
        try:
            nlp = spacy.load("en_core_web_sm")
        except:
            logger.warning("   en_core_web_sm not found. Downloading...")
            os.system("python -m spacy download en_core_web_sm")
            nlp = spacy.load("en_core_web_sm")
    
    return nlp

def load_course_translator():
    """Load the course translator for Malay to English conversion"""
    global course_translator
    
    try:
        course_translator = get_translator()
        if course_translator.is_loaded():
            count = course_translator.get_mapping_count()
            logger.info(f"✅ Loaded course translator with {count} mappings")
        else:
            logger.warning("⚠️  Course translator loaded but has no mappings")
    except Exception as e:
        logger.error(f"❌ Error loading course translator: {e}")
        course_translator = None
    
    return course_translator

def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        if HAS_PYMUPDF:
            with fitz.open(file_path) as doc:
                text = ""
                for page in doc:
                    text += page.get_text()
            return text
        else:
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
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

def get_model_confidence_from_entity(doc, ent):
    """
    Calculate model-based confidence from spaCy entity
    
    This analyzes the model's internal predictions to estimate confidence
    """
    try:
        confidence_score = 0.0
        
        # Factor 1: Entity consistency (40% weight)
        matching_tokens = sum(1 for token in ent if token.ent_type_ == ent.label_)
        entity_consistency = matching_tokens / len(ent) if len(ent) > 0 else 0.0
        confidence_score += entity_consistency * 0.40
        
        # Factor 2: Entity IOB consistency (30% weight)
        iob_correct = True
        for i, token in enumerate(ent):
            expected_iob = "B" if i == 0 else "I"
            if token.ent_iob_ != expected_iob:
                iob_correct = False
                break
        
        iob_score = 1.0 if iob_correct else 0.6
        confidence_score += iob_score * 0.30
        
        # Factor 3: Entity not overlapping or fragmented (20% weight)
        clean_boundaries = True
        if ent.start > 0 and doc[ent.start - 1].ent_type_:
            clean_boundaries = False
        if ent.end < len(doc) and doc[ent.end].ent_type_:
            clean_boundaries = False
        
        boundary_score = 1.0 if clean_boundaries else 0.7
        confidence_score += boundary_score * 0.20
        
        # Factor 4: Entity appears in typical position (10% weight)
        position_score = max(0.7, 1.0 - (ent.start / len(doc)))
        confidence_score += position_score * 0.10
        
        return round(confidence_score, 3)
        
    except Exception as e:
        logger.debug(f"Could not calculate model confidence: {e}")
        return 0.85

def calculate_enhanced_confidence(entity_text, entity_label, extraction_method, model_confidence=None):
    """
    Calculate enhanced confidence score based on multiple factors
    """
    base_confidence = 0.0
    
    if model_confidence is not None:
        base_confidence = model_confidence
        logger.info(f"  Using model confidence: {model_confidence:.3f}")
    else:
        base_confidence = 0.90  # Custom NER default
    
    quality_score = 1.0
    
    if entity_label == "STUDENT_NAME":
        words = entity_text.split()
        
        if len(words) > 6:
            quality_score *= 0.90
        
        malay_indicators = ['BIN', 'BINTI', 'BT', 'BINTE', 'A/L', 'A/P']
        if any(word.upper() in malay_indicators for word in words):
            quality_score *= 1.05
        
        if not (entity_text.isupper() or entity_text.istitle()):
            quality_score *= 0.95
    
    elif entity_label == "CGPA":
        try:
            cgpa_val = float(entity_text)
            
            if cgpa_val == 4.0:
                quality_score *= 1.05
            
            if cgpa_val < 1.0:
                quality_score *= 0.90
            
            if '.' in entity_text and len(entity_text.split('.')[1]) == 2:
                quality_score *= 1.02
        except:
            quality_score *= 0.80
    
    elif entity_label == "PROGRAM":
        program_keywords = ['DIPLOMA', 'DEGREE', 'BACHELOR', 'MASTER', 'IJAZAH']
        if any(kw in entity_text.upper() for kw in program_keywords):
            quality_score *= 1.05
        
        if len(entity_text) > 150:
            quality_score *= 0.90
    
    final_confidence = min(base_confidence * quality_score, 1.0)
    
    return round(final_confidence, 3)

def extract_with_custom_ner(text):
    """
    Extract information using Custom NER Model Only
    With model-based confidence calculation
    """
    logger.info("=== Extracting with Custom NER Only ===")
    
    doc = nlp(text)
    
    name = None
    cgpa = None
    program = None
    
    name_confidence = 0.0
    cgpa_confidence = 0.0
    program_confidence = 0.0
    
    # Extract entities using NER model
    for ent in doc.ents:
        logger.info(f"NER found: '{ent.text[:50]}...' -> {ent.label_}")
        
        model_conf = get_model_confidence_from_entity(doc, ent)
        logger.info(f"  Model confidence: {model_conf:.3f}")
        
        # Extract STUDENT_NAME
        if ent.label_ == "STUDENT_NAME" and name is None:
            raw_name = ent.text.strip()
            
            # Clean up if too long (>100 chars)
            if len(raw_name) > 100:
                logger.warning(f"Name too long ({len(raw_name)} chars), cleaning...")
                lines = raw_name.split('\n')
                
                for line in lines[:10]:
                    line = line.strip()
                    words = line.split()
                    
                    if 2 <= len(words) <= 8 and all(w.replace('-', '').replace("'", '').isalpha() for w in words):
                        name = line
                        name_confidence = calculate_enhanced_confidence(
                            line, "STUDENT_NAME", "ner", model_conf * 0.85
                        )
                        logger.info(f"✓ NER extracted NAME (cleaned): '{name}' (confidence: {name_confidence})")
                        break
            else:
                name = raw_name
                name_confidence = calculate_enhanced_confidence(
                    raw_name, "STUDENT_NAME", "ner", model_conf
                )
                logger.info(f"✓ NER extracted NAME: '{name}' (confidence: {name_confidence})")
        
        # Extract CGPA
        elif ent.label_ == "CGPA" and cgpa is None:
            try:
                cgpa_text = ent.text.strip()
                cgpa_value = float(cgpa_text)
                
                if 0.0 <= cgpa_value <= 4.0:
                    cgpa = f"{cgpa_value:.2f}"
                    cgpa_confidence = calculate_enhanced_confidence(
                        cgpa, "CGPA", "ner", model_conf
                    )
                    logger.info(f"✓ NER extracted CGPA: {cgpa} (confidence: {cgpa_confidence})")
                else:
                    logger.warning(f"Invalid CGPA range: {cgpa_value}")
            except ValueError:
                logger.warning(f"Cannot parse CGPA: {ent.text}")
        
        # Extract PROGRAM
        elif ent.label_ == "PROGRAM" and program is None:
            raw_program = ent.text.strip()
            
            # Clean up if too long
            if len(raw_program) > 200:
                logger.warning(f"Program too long ({len(raw_program)} chars), taking first line...")
                lines = raw_program.split('\n')
                program = lines[0].strip() if lines else raw_program
            else:
                program = raw_program
            
            if program:
                program_confidence = calculate_enhanced_confidence(
                    program, "PROGRAM", "ner", model_conf
                )
                logger.info(f"✓ NER extracted PROGRAM: '{program[:50]}...' (confidence: {program_confidence})")
    
    # Calculate overall confidence
    overall_confidence = (name_confidence + cgpa_confidence + program_confidence) / 3
    
    # Translate program from Malay to English
    program_malay = program
    program_english = program
    field_of_study = None
    
    if program and course_translator:
        logger.info(f"🔄 Translating program: {program[:50]}...")
        program_english = course_translator.translate(program)
        field_of_study = course_translator.map_to_field_category(program_english)
        
        if program_english != program:
            logger.info(f"✅ Translated: {program[:50]}... → {program_english[:50]}...")
            logger.info(f"📚 Field of Study: {field_of_study}")
        else:
            logger.info(f"ℹ️  No translation needed")
    
    return {
        'name': name,
        'cgpa': cgpa,
        'program': program_english,
        'program_malay': program_malay,
        'program_english': program_english,
        'field_of_study': field_of_study,
        'confidence': {
            'name': name_confidence,
            'cgpa': cgpa_confidence,
            'program': program_confidence,
            'overall': round(overall_confidence, 3)
        },
        'method': 'custom_ner_only',
        'quality_tier': 'high' if overall_confidence >= 0.85 else 'medium' if overall_confidence >= 0.70 else 'low',
        'model_based_confidence': True
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    
    model_type = "Custom NER" if "custom_transcript_ner_model" in str(nlp.path) else "Default spaCy"
    
    labels = []
    if nlp and nlp.get_pipe("ner"):
        labels = list(nlp.get_pipe("ner").labels)
    
    translator_status = "Not loaded"
    translator_mappings = 0
    if course_translator:
        translator_status = "Loaded"
        translator_mappings = course_translator.get_mapping_count()
    
    return jsonify({
        'status': 'OK',
        'message': 'NER extraction service is running',
        'service': 'ner_service',
        'port': 5001,
        'model': model_type,
        'entity_labels': labels,
        'approach': 'custom_ner_only',
        'features': ['model_based_confidence', 'quality_tier', 'course_translation'],
        'course_translator': {
            'status': translator_status,
            'mappings': translator_mappings
        }
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
                'confidence': {'name': 0.0, 'cgpa': 0.0, 'program': 0.0, 'overall': 0.0}
            }), 400
        
        file_path = data['filePath']
        file_name = data.get('fileName', 'unknown')
        
        logger.info(f"Processing: {file_name}")
        
        text = extract_text_from_file(file_path)
        
        if not text:
            return jsonify({
                'error': 'Could not extract text',
                'name': None,
                'cgpa': None,
                'program': None,
                'confidence': {'name': 0.0, 'cgpa': 0.0, 'program': 0.0, 'overall': 0.0}
            }), 400
        
        logger.info(f"Extracted {len(text)} characters")
        
        result = extract_with_custom_ner(text)
        
        result['fileName'] = file_name
        result['textLength'] = len(text)
        
        logger.info(f"Results: name={result['name']}, cgpa={result['cgpa']}, program={result['program'][:30] if result['program'] else None}")
        logger.info(f"Confidence: overall={result['confidence']['overall']}, quality_tier={result['quality_tier']}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return jsonify({
            'error': str(e),
            'name': None,
            'cgpa': None,
            'program': None,
            'confidence': {'name': 0.0, 'cgpa': 0.0, 'program': 0.0, 'overall': 0.0}
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🐍 NER Extraction Service (Custom NER Only)")
    print("=" * 60)
    print("📋 Details:")
    print("   - Port: 5001")
    print("   - Entities: STUDENT_NAME, CGPA, PROGRAM")
    print("   - Method: Custom NER Model Only")
    print("   - Confidence: Model-based + Quality checks")
    print("   - Features: Course Translation (Malay → English)")
    print("   - Health: http://localhost:5001/health")
    print("")
    
    print("🤖 Loading NER model...")
    load_custom_ner_model()
    
    if nlp:
        print("✅ NER Model loaded!")
        if nlp.get_pipe("ner"):
            labels = nlp.get_pipe("ner").labels
            print(f"🏷️  Labels: {labels}")
    
    print("\n📚 Loading course translator...")
    load_course_translator()
    
    if course_translator:
        count = course_translator.get_mapping_count()
        print(f"✅ Course Translator loaded! ({count} mappings)")
    
    print("=" * 60)
    
    app.run(host='::', port=5001, debug=True)