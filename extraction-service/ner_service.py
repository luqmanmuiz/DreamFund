#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    from pypdf import PdfReader
import re
import os
from pathlib import Path
import logging
import spacy

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:5000'])

# Global NER model
nlp = None

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

def is_likely_person_name(text):
    """Validate if text looks like a person's name"""
    
    if not text or len(text.strip()) < 3:
        return False
    
    text = text.strip()
    words = text.split()
    
    # Name should have 2-8 words
    if not (2 <= len(words) <= 8):
        logger.info(f"    Validation: {len(words)} words (need 2-8)")
        return False
    
    # All words should be alphabetic (allow ', -, /)
    if not all(w.replace("'", "").replace("-", "").replace("/", "").isalpha() for w in words):
        logger.info(f"    Validation: Contains non-alphabetic characters")
        return False
    
    # Exclude faculty keywords
    faculty_keywords = ['FAKULTI', 'FACULTY']
    if any(keyword in text.upper() for keyword in faculty_keywords):
        logger.info(f"    Validation: Contains faculty keyword")
        return False
    
    # *** NEW: Exclude common field labels ***
    field_labels = [
        'DATE OF BIRTH', 'PLACE OF BIRTH', 'STUDENT NUMBER', 'STUDENT ID',
        'MATRIX NUMBER', 'MATRICULATION NUMBER', 'ENTRY DATE', 'GRADUATION DATE',
        'KOLEJ PENGAJIAN', 'FACULTY OF', 'PROGRAM OF STUDY', 'COURSE OF STUDY',
        'TOTAL CREDIT', 'CREDIT HOURS', 'SEMESTER AND', 'ACADEMIC SESSION'
    ]
    if any(label in text.upper() for label in field_labels):
        logger.info(f"    Validation: Matches field label pattern")
        return False
    
    # Check for Malaysian name patterns
    malay_indicators = ['BIN', 'BINTI', 'BT', 'BINTE', 'A/L', 'A/P', 'AP', 'AL']
    has_malay_pattern = any(word.upper() in malay_indicators for word in words)
    
    if has_malay_pattern:
        logger.info(f"    Validation: ✓ Has Malaysian name pattern")
        return True
    
    # Use spaCy NER as validation
    try:
        doc = nlp(text)
        has_person_entity = any(ent.label_ == "PERSON" for ent in doc.ents)
        
        if has_person_entity:
            logger.info(f"    Validation: ✓ spaCy recognizes as PERSON")
            return True
    except:
        pass
    
    # If 3+ words and all caps (common in transcripts), likely a name
    # *** MODIFIED: More strict check ***
    if len(words) >= 3 and all(w.isupper() for w in words):
        # Additional check: should not contain words that indicate it's not a name
        institutional_words = ['KOLEJ', 'COLLEGE', 'UNIVERSITI', 'UNIVERSITY', 
                               'PENGAJIAN', 'STUDIES', 'KEJURUTERAAN', 'ENGINEERING',
                               'PERUBATAN', 'MEDICINE', 'SAINS', 'SCIENCE']
        if any(word in text.upper() for word in institutional_words):
            logger.info(f"    Validation: ✗ Contains institutional keyword")
            return False
        
        logger.info(f"    Validation: ✓ 3+ words, all uppercase")
        return True
    
    logger.info(f"    Validation: ✗ Failed all checks")
    return False

def extract_name_with_rules(text):
    """Fallback Layer 2: Extract name using rules"""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    logger.info("→ Trying rules-based name extraction...")
    
    field_keywords = {
        'NAME', 'GENDER', 'PROGRAM', 'FACULTY', 'FAKULTI', 'ADDRESS', 
        'NRIC', 'PASSPORT', 'STUDENT ID', 'CITIZENSHIP', 'INTAKE', 
        'LEVEL', 'RESULTS', 'SESSION', 'MALE', 'FEMALE', 'DIPLOMA', 
        'BACHELOR', 'DEGREE', 'COMPLETED', 'LU', 'CREDIT'
    }
    
    skip_patterns = [
        r'FAKULTI', r'^\d{12}$', r'JLN|JALAN|TMN|TAMAN',
        r'SAINS|KOMPUTER|MATEMATIK', r'M/S \d', r'^\d{10}$',
    ]
    
    # Find NAME field
    for i, line in enumerate(lines):
        if line.upper() == 'NAME':
            logger.info(f"  ✓ Found NAME field at line {i}")
            
            # Check next 20 lines
            for j in range(i + 1, min(i + 20, len(lines))):
                candidate = lines[j].strip()
                
                if not candidate:
                    continue
                
                logger.info(f"  Checking line {j}: '{candidate}'")
                
                # *** NEW: Strip leading colons and whitespace ***
                candidate = candidate.lstrip(':').strip()
                
                if not candidate:
                    continue
                
                # Skip field keywords
                if any(keyword in candidate.upper() for keyword in field_keywords):
                    logger.info(f"    → Skip: field keyword")
                    continue
                
                # Skip patterns
                skip = False
                for pattern in skip_patterns:
                    if re.search(pattern, candidate.upper()):
                        logger.info(f"    → Skip: matches pattern {pattern}")
                        skip = True
                        break
                if skip:
                    continue
                
                # Skip pure numbers
                if re.match(r'^\d+$', candidate):
                    logger.info(f"    → Skip: pure number")
                    continue
                
                # Check word count
                words = candidate.split()
                if not (2 <= len(words) <= 8):
                    logger.info(f"    → Skip: {len(words)} words (need 2-8)")
                    continue
                
                # Check if alphabetic
                if not all(w.replace("'", "").replace("-", "").replace("/", "").isalpha() for w in words):
                    logger.info(f"    → Skip: non-alphabetic characters")
                    continue
                
                # Validate as name
                logger.info(f"  Validating candidate: '{candidate}'")
                if is_likely_person_name(candidate):
                    logger.info(f"  ✓ Rules extracted NAME: '{candidate}'")
                    return candidate, 0.85
                else:
                    logger.info(f"    → Failed validation")
    
    logger.warning("✗ Rules: No name found")
    return None, 0.0

def extract_name_with_spacy_ner(text):
    """Fallback Layer 3: Extract name using default spaCy NER (PERSON entity)"""
    logger.info("→ Trying spaCy en_core_web_sm NER as final fallback...")
    
    doc = nlp(text)
    
    # Collect all PERSON entities
    person_entities = []
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            logger.info(f"  Found PERSON: '{ent.text}'")
            person_entities.append(ent.text)
    
    if not person_entities:
        logger.info("✗ spaCy NER: No PERSON entities found")
        return None, 0.0
    
    # Score and validate each person entity
    for person_name in person_entities:
        if is_likely_person_name(person_name):
            logger.info(f"✓ spaCy NER extracted NAME: '{person_name}'")
            return person_name, 0.75  # Lower confidence (final fallback)
    
    logger.info("✗ spaCy NER: Found PERSON entities but failed validation")
    return None, 0.0

def extract_cgpa_with_rules(text):
    """Fallback: Extract CGPA using rules"""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    # Method 1: Find FINAL CGPA
    for i, line in enumerate(lines):
        if 'FINAL' in line.upper() and 'CGPA' in line.upper():
            logger.info(f"✓ Found FINAL CGPA at line {i}")
            
            # Check same line
            numbers = re.findall(r'\b(\d+\.\d+)\b', line)
            for num in numbers:
                cgpa = float(num)
                if 0.0 <= cgpa <= 4.0:
                    logger.info(f"✓ Rules extracted CGPA: {cgpa}")
                    return f"{cgpa:.2f}", 0.90
            
            # Check next 5 lines
            for j in range(i + 1, min(i + 6, len(lines))):
                next_line = lines[j].strip()
                numbers = re.findall(r'\b(\d+\.\d+)\b', next_line)
                for num in numbers:
                    cgpa = float(num)
                    if 0.0 <= cgpa <= 4.0:
                        logger.info(f"✓ Rules extracted CGPA: {cgpa}")
                        return f"{cgpa:.2f}", 0.90
    
    # Method 2: Regex pattern
    match = re.search(r'FINAL\s+CGPA\s*[\s:\n]*(\d+\.\d+)', text, re.IGNORECASE | re.MULTILINE)
    if match:
        cgpa = float(match.group(1))
        if 0.0 <= cgpa <= 4.0:
            logger.info(f"✓ Rules extracted CGPA via regex: {cgpa}")
            return f"{cgpa:.2f}", 0.85
    
    # Method 3: Last CGPA value
    matches = re.findall(r'CGPA\s*[\s:]*(\d+\.\d+)', text, re.IGNORECASE)
    valid_cgpas = [float(m) for m in matches if 0.0 <= float(m) <= 4.0]
    
    if valid_cgpas:
        final_cgpa = valid_cgpas[-1]
        logger.info(f"✓ Rules extracted last CGPA: {final_cgpa}")
        return f"{final_cgpa:.2f}", 0.80
    
    logger.warning("✗ Rules: No CGPA found")
    return None, 0.0

def extract_program_with_rules(text):
    """Fallback: Extract program using rules with better validation"""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    # Skip common non-program patterns
    skip_patterns = [
        r'FAKULTI',  # Faculty name, not program
        r'FACULTY OF',  # Faculty header
        r'UNIVERSITI',  # University name
        r'CERTIFICATE OF',  # Certificate title
        r'ACADEMIC TRANSCRIPT',  # Document header
        r'^\d{4}/\d{4}$',  # Academic year
        r'^SESSION',  # Session info
    ]
    
    # Method 1: Find PROGRAM field
    for i, line in enumerate(lines):
        if line.upper() == 'PROGRAM' or line.upper() == 'PROGRAMME':
            logger.info(f"✓ Found PROGRAM field at line {i}")
            
            for j in range(i + 1, min(i + 10, len(lines))):
                candidate = lines[j].strip()
                
                # *** NEW: Strip leading colons and whitespace ***
                candidate = candidate.lstrip(':').strip()
                
                # Skip empty or too short
                if not candidate or len(candidate) < 10:
                    continue
                
                # Skip patterns
                skip = False
                for pattern in skip_patterns:
                    if re.search(pattern, candidate.upper()):
                        logger.info(f"    → Skip: matches pattern {pattern}")
                        skip = True
                        break
                if skip:
                    continue
                
                # Must contain degree keyword
                if any(kw in candidate.upper() for kw in ['DIPLOMA', 'DEGREE', 'BACHELOR', 'MASTER', 'IJAZAH', 'SARJANA']):
                    # Validate it looks like a program name
                    words = candidate.split()
                    if 3 <= len(words) <= 20:  # Reasonable program name length
                        logger.info(f"✓ Rules extracted PROGRAM: '{candidate}'")
                        return candidate, 0.90
    
    # Method 2: Find lines with degree keywords (more strict)
    keywords = ['BACHELOR OF', 'MASTER OF', 'DIPLOMA IN', 'IJAZAH SARJANA MUDA']
    for line in lines:
        for keyword in keywords:
            if keyword in line.upper():
                # Skip patterns
                skip = False
                for pattern in skip_patterns:
                    if re.search(pattern, line.upper()):
                        skip = True
                        break
                if skip:
                    continue
                
                words = line.split()
                if 3 <= len(words) <= 20:
                    # Clean up program name
                    cleaned = re.sub(r'^(PROGRAM|PROGRAMME|COURSE)\s*:?\s*', '', line, flags=re.IGNORECASE)
                    cleaned = cleaned.strip()
                    
                    if cleaned and len(cleaned) > 10:
                        logger.info(f"✓ Rules extracted PROGRAM: '{cleaned}'")
                        return cleaned, 0.85
    
    logger.warning("✗ Rules: No program found")
    return None, 0.0


def is_valid_program_name(text):
    """Validate if text looks like a valid program name"""
    if not text or len(text.strip()) < 10:
        return False
    
    text = text.strip()
    
    # Skip if it's just a faculty name
    faculty_keywords = ['FAKULTI', 'FACULTY OF', 'SCHOOL OF']
    if any(kw in text.upper() for kw in faculty_keywords) and not any(deg in text.upper() for deg in ['DIPLOMA', 'DEGREE', 'BACHELOR', 'MASTER']):
        logger.info(f"    Validation: Just a faculty name, not a program")
        return False
    
    # Must contain at least one degree keyword
    degree_keywords = ['DIPLOMA', 'DEGREE', 'BACHELOR', 'MASTER', 'IJAZAH', 'SARJANA']
    if not any(kw in text.upper() for kw in degree_keywords):
        logger.info(f"    Validation: No degree keyword found")
        return False
    
    # Check word count (3-20 words is reasonable)
    words = text.split()
    if not (3 <= len(words) <= 20):
        logger.info(f"    Validation: {len(words)} words (need 3-20)")
        return False
    
    # Skip if it looks like a header or document title
    if text.upper().startswith('ACADEMIC') or text.upper().startswith('CERTIFICATE OF'):
        logger.info(f"    Validation: Looks like document header")
        return False
    
    return True

def get_model_confidence_from_entity(doc, ent):
    """
    Calculate model-based confidence from spaCy entity
    
    This analyzes the model's internal predictions to estimate confidence
    """
    try:
        confidence_score = 0.0
        
        # Factor 1: Entity consistency (40% weight)
        # Check if all tokens in entity have matching entity tags
        matching_tokens = sum(1 for token in ent if token.ent_type_ == ent.label_)
        entity_consistency = matching_tokens / len(ent) if len(ent) > 0 else 0.0
        confidence_score += entity_consistency * 0.40
        
        # Factor 2: Entity IOB consistency (30% weight)
        # Proper B-I-I-I pattern indicates model certainty
        iob_correct = True
        for i, token in enumerate(ent):
            expected_iob = "B" if i == 0 else "I"
            if token.ent_iob_ != expected_iob:
                iob_correct = False
                break
        
        iob_score = 1.0 if iob_correct else 0.6
        confidence_score += iob_score * 0.30
        
        # Factor 3: Entity not overlapping or fragmented (20% weight)
        # Check if entity is cleanly separated from others
        clean_boundaries = True
        if ent.start > 0 and doc[ent.start - 1].ent_type_:
            clean_boundaries = False
        if ent.end < len(doc) and doc[ent.end].ent_type_:
            clean_boundaries = False
        
        boundary_score = 1.0 if clean_boundaries else 0.7
        confidence_score += boundary_score * 0.20
        
        # Factor 4: Entity appears in typical position (10% weight)
        # Entities at beginning of document are more likely to be correct
        position_score = max(0.7, 1.0 - (ent.start / len(doc)))
        confidence_score += position_score * 0.10
        
        return round(confidence_score, 3)
        
    except Exception as e:
        logger.debug(f"Could not calculate model confidence: {e}")
        return 0.85  # Default to high confidence if calculation fails


def calculate_enhanced_confidence(entity_text, entity_label, extraction_method, model_confidence=None):
    """
    Calculate enhanced confidence score based on multiple factors
    
    Args:
        entity_text: The extracted text
        entity_label: Type of entity (STUDENT_NAME, CGPA, PROGRAM)
        extraction_method: Method used (ner, rules, spacy_fallback)
        model_confidence: Raw confidence from model analysis (if available)
    
    Returns:
        float: Confidence score between 0.0 and 1.0
    """
    base_confidence = 0.0
    
    # Use model confidence if available, otherwise use method-based baseline
    if model_confidence is not None:
        base_confidence = model_confidence
        logger.info(f"  Using model confidence: {model_confidence:.3f}")
    else:
        # Base confidence by extraction method
        if extraction_method == "ner":
            base_confidence = 0.90
        elif extraction_method == "rules":
            base_confidence = 0.80
        elif extraction_method == "spacy_fallback":
            base_confidence = 0.70
    
    # Apply quality adjustments
    quality_score = 1.0
    
    if entity_label == "STUDENT_NAME":
        # Check name quality
        words = entity_text.split()
        
        # Penalty for very long names
        if len(words) > 6:
            quality_score *= 0.90
        
        # Bonus for Malaysian name patterns
        malay_indicators = ['BIN', 'BINTI', 'BT', 'BINTE', 'A/L', 'A/P']
        if any(word.upper() in malay_indicators for word in words):
            quality_score *= 1.05
        
        # Penalty for mixed case (inconsistent formatting)
        if not (entity_text.isupper() or entity_text.istitle()):
            quality_score *= 0.95
    
    elif entity_label == "CGPA":
        try:
            cgpa_val = float(entity_text)
            
            # Perfect CGPA is more confident (less ambiguity)
            if cgpa_val == 4.0:
                quality_score *= 1.05
            
            # Very low CGPA might be extraction error
            if cgpa_val < 1.0:
                quality_score *= 0.90
            
            # Check decimal precision (more precise = more confident)
            if '.' in entity_text and len(entity_text.split('.')[1]) == 2:
                quality_score *= 1.02
        except:
            quality_score *= 0.80
    
    elif entity_label == "PROGRAM":
        # Check program name quality
        program_keywords = ['DIPLOMA', 'DEGREE', 'BACHELOR', 'MASTER', 'IJAZAH']
        if any(kw in entity_text.upper() for kw in program_keywords):
            quality_score *= 1.05
        
        # Penalty for very long programs (might be extraction error)
        if len(entity_text) > 150:
            quality_score *= 0.90
    
    # Calculate final confidence (cap at 1.0)
    final_confidence = min(base_confidence * quality_score, 1.0)
    
    return round(final_confidence, 3)


def extract_with_custom_ner(text):
    """
    Extract information using Custom NER + Rules + spaCy NER fallback
    With model-based confidence calculation
    """
    logger.info("=== Extracting with Custom NER + Model Confidence ===")
    
    # Process with NER model
    doc = nlp(text)
    
    name = None
    cgpa = None
    program = None
    
    name_confidence = 0.0
    cgpa_confidence = 0.0
    program_confidence = 0.0
    
    name_method = None
    cgpa_method = None
    program_method = None
    
    # Try NER extraction first
    for ent in doc.ents:
        logger.info(f"NER found: '{ent.text[:50]}...' -> {ent.label_}")
        
        # Get model-based confidence
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
                    
                    # Find valid name line
                    if 2 <= len(words) <= 8 and all(w.replace('-', '').replace("'", '').isalpha() for w in words):
                        name = line
                        name_confidence = calculate_enhanced_confidence(
                            line, "STUDENT_NAME", "ner", model_conf * 0.85  # Reduce confidence for cleaned
                        )
                        name_method = "custom_ner_cleaned"
                        logger.info(f"✓ NER extracted NAME (cleaned): '{name}' (confidence: {name_confidence})")
                        break
            else:
                name = raw_name
                name_confidence = calculate_enhanced_confidence(
                    raw_name, "STUDENT_NAME", "ner", model_conf
                )
                name_method = "custom_ner"
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
                    cgpa_method = "custom_ner"
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
                logger.warning(f"Program too long ({len(raw_program)} chars), extracting first line...")
                # Try to extract first complete program
                lines = raw_program.split('\n')
                for line in lines[:5]:
                    line = line.strip()
                    if is_valid_program_name(line):
                        program = line
                        break
                
                if not program:
                    program = lines[0].strip()
            else:
                program = raw_program
            
            # Validate the program name
            if program and is_valid_program_name(program):
                program_confidence = calculate_enhanced_confidence(
                    program, "PROGRAM", "ner", model_conf
                )
                program_method = "custom_ner"
                logger.info(f"✓ NER extracted PROGRAM: '{program[:50]}...' (confidence: {program_confidence})")
            else:
                logger.warning(f"Program validation failed: '{program[:100]}...'")
                program = None  # Reset to try fallback
    
    # FALLBACK CHAIN for NAME: Custom NER → Rules → spaCy NER
    if name is None:
        logger.info("→ Custom NER didn't find NAME, trying Layer 2 (rules)...")
        name, name_confidence = extract_name_with_rules(text)
        if name:
            name_method = "rules"
            name_confidence = calculate_enhanced_confidence(name, "STUDENT_NAME", "rules")
    
    if name is None:
        logger.info("→ Rules didn't find NAME, trying Layer 3 (spaCy NER)...")
        name, name_confidence = extract_name_with_spacy_ner(text)
        if name:
            name_method = "spacy_fallback"
            name_confidence = calculate_enhanced_confidence(name, "STUDENT_NAME", "spacy_fallback")
    
    # FALLBACK for CGPA: Rules only
    if cgpa is None:
        logger.info("→ NER didn't find CGPA, trying rules...")
        cgpa, cgpa_confidence = extract_cgpa_with_rules(text)
        if cgpa:
            cgpa_method = "rules"
            cgpa_confidence = calculate_enhanced_confidence(cgpa, "CGPA", "rules")
    
    # FALLBACK for PROGRAM: Rules only
    if program is None:
        logger.info("→ NER didn't find PROGRAM, trying rules...")
        program, program_confidence = extract_program_with_rules(text)
        if program:
            program_method = "rules"
            program_confidence = calculate_enhanced_confidence(program, "PROGRAM", "rules")
    
    # Determine overall extraction method
    method = "hybrid"
    if name_confidence >= 0.85 and cgpa_confidence >= 0.85 and program_confidence >= 0.85:
        method = "custom_ner"
    elif name_confidence <= 0.75 and cgpa_confidence <= 0.75 and program_confidence <= 0.75:
        method = "rules_and_spacy_ner"
    
    # Calculate overall extraction quality
    confidences = [c for c in [name_confidence, cgpa_confidence, program_confidence] if c > 0]
    overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    
    return {
        'name': name,
        'cgpa': cgpa,
        'program': program,
        'confidence': {
            'name': name_confidence,
            'cgpa': cgpa_confidence,
            'program': program_confidence,
            'overall': round(overall_confidence, 3)
        },
        'extraction_methods': {
            'name': name_method,
            'cgpa': cgpa_method,
            'program': program_method
        },
        'method': method,
        'quality_tier': 'high' if overall_confidence >= 0.85 else 'medium' if overall_confidence >= 0.70 else 'low',
        'model_based_confidence': True  # Flag indicating we use model confidence
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    
    model_type = "Custom NER" if "custom_transcript_ner_model" in str(nlp.path) else "Default spaCy"
    
    labels = []
    if nlp and nlp.get_pipe("ner"):
        labels = list(nlp.get_pipe("ner").labels)
    
    return jsonify({
        'status': 'OK',
        'message': 'NER extraction service is running',
        'service': 'ner_service',
        'port': 5001,
        'model': model_type,
        'entity_labels': labels,
        'approach': 'hybrid_ner_rules_spacy_with_model_confidence',
        'features': ['model_based_confidence', 'quality_tier', 'extraction_methods']
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
        
        # Extract text
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
        
        # Extract information
        result = extract_with_custom_ner(text)
        
        # Add metadata
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
    print("🐍 NER Extraction Service (Model-Based Confidence)")
    print("=" * 60)
    print("📋 Details:")
    print("   - Port: 5001")
    print("   - Entities: STUDENT_NAME, CGPA, PROGRAM")
    print("   - Method: Custom NER → Rules → spaCy NER")
    print("   - Confidence: Model-based + Quality checks")
    print("   - Health: http://localhost:5001/health")
    print("")
    
    print("🤖 Loading model...")
    load_custom_ner_model()
    
    if nlp:
        print("✅ Model loaded!")
        if nlp.get_pipe("ner"):
            labels = nlp.get_pipe("ner").labels
            print(f"🏷️  Labels: {labels}")
    
    print("=" * 60)
    
    app.run(host='::', port=5001, debug=True)