#!/usr/bin/env python3
"""
Course Translator Module
Translates Malay course names to English based on UiTM course mapping file
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class CourseTranslator:
    """Translates Malay course names to English equivalents"""
    
    def __init__(self, mapping_file='../server/course.txt'):
        """
        Initialize the course translator
        
        Args:
            mapping_file: Path to the course mapping file (Malay = English format)
        """
        self.course_mapping = {}
        self.reverse_mapping = {}
        self._load_course_mapping(mapping_file)
    
    def _load_course_mapping(self, filepath):
        """
        Load course mappings from txt file
        
        Args:
            filepath: Path to the mapping file
        """
        try:
            # Try relative path first
            if not os.path.isabs(filepath):
                current_dir = Path(__file__).parent
                filepath = current_dir / filepath
            
            if not os.path.exists(filepath):
                logger.error(f"❌ Course mapping file not found: {filepath}")
                return
            
            with open(filepath, 'r', encoding='utf-8') as f:
                line_count = 0
                for line in f:
                    line = line.strip()
                    if '=' in line:
                        try:
                            malay, english = line.split('=', 1)
                            malay_clean = malay.strip()
                            english_clean = english.strip()
                            
                            # Store both normalized (for matching) and original (for reference)
                            malay_normalized = malay_clean.lower()
                            
                            self.course_mapping[malay_normalized] = english_clean
                            self.reverse_mapping[english_clean.lower()] = malay_clean
                            line_count += 1
                        except Exception as e:
                            logger.warning(f"⚠️  Skipping malformed line: {line}")
                
                logger.info(f"✅ Loaded {line_count} course mappings from {filepath}")
                
        except FileNotFoundError:
            logger.error(f"❌ Course mapping file not found: {filepath}")
        except Exception as e:
            logger.error(f"❌ Error loading course mappings: {e}")
    
    def translate(self, malay_course_name):
        """
        Translate a single Malay course name to English
        
        Args:
            malay_course_name: Course name in Malay
            
        Returns:
            English course name if found, original name otherwise
        """
        if not malay_course_name:
            return malay_course_name
        
        normalized = malay_course_name.strip().lower()
        
        # Direct match
        if normalized in self.course_mapping:
            english_name = self.course_mapping[normalized]
            logger.debug(f"✅ Translated: {malay_course_name} → {english_name}")
            return english_name
        
        # Try fuzzy matching for common variations
        english_name = self._fuzzy_match(normalized)
        if english_name:
            logger.debug(f"✅ Fuzzy matched: {malay_course_name} → {english_name}")
            return english_name
        
        # Return original if no match found
        logger.warning(f"⚠️  No translation found for: {malay_course_name}")
        return malay_course_name
    
    def _fuzzy_match(self, normalized_course):
        """
        Attempt fuzzy matching for course names with abbreviations or variations
        
        Args:
            normalized_course: Normalized course name
            
        Returns:
            English course name if fuzzy match found, None otherwise
        """
        # Common abbreviations
        variations = [
            normalized_course.replace('dip.', 'diploma'),
            normalized_course.replace('dip ', 'diploma '),
            normalized_course.replace('sarjana muda', 'bachelor'),
            normalized_course.replace('s.m.', 'sarjana muda'),
        ]
        
        for variation in variations:
            if variation in self.course_mapping:
                return self.course_mapping[variation]
        
        # Partial matching (find if normalized_course is substring of any key)
        for key, value in self.course_mapping.items():
            if normalized_course in key or key in normalized_course:
                # Check if it's a significant match (>80% overlap)
                if len(normalized_course) > 15 and (
                    normalized_course in key or 
                    key in normalized_course
                ):
                    return value
        
        return None
    
    def translate_batch(self, course_list):
        """
        Translate multiple course names
        
        Args:
            course_list: List of Malay course names
            
        Returns:
            List of English course names
        """
        return [self.translate(course) for course in course_list]
    
    def is_loaded(self):
        """Check if course mappings were loaded successfully"""
        return len(self.course_mapping) > 0
    
    def get_mapping_count(self):
        """Get the number of loaded course mappings"""
        return len(self.course_mapping)
    
    def map_to_field_category(self, english_course_name):
        """
        Map specific course to broader field of study category
        
        Args:
            english_course_name: Course name in English
            
        Returns:
            Field of study category
        """
        if not english_course_name:
            return "Other"
        
        course_lower = english_course_name.lower()
        
        # Mapping rules based on keywords
        field_mappings = {
            'Computer Science': ['computer science', 'information technology', 'software', 'computing'],
            'Engineering': ['engineering', 'kejuruteraan'],
            'Business': ['business', 'perniagaan', 'accounting', 'finance', 'marketing', 'management'],
            'Medicine': ['medicine', 'medical', 'perubatan', 'surgery', 'dental', 'pharmacy'],
            'Nursing': ['nursing', 'kejururawatan'],
            'Science': ['science', 'sains', 'biology', 'chemistry', 'physics', 'mathematics'],
            'Arts': ['arts', 'seni', 'design', 'music', 'theatre', 'animation'],
            'Education': ['education', 'pendidikan', 'teaching'],
            'Communication': ['communication', 'komunikasi', 'media', 'journalism'],
            'Law': ['law', 'undang-undang', 'legal'],
            'Architecture': ['architecture', 'senibina', 'landscape', 'interior'],
            'Pharmacy': ['pharmacy', 'farmasi'],
            'Agriculture': ['agriculture', 'pertanian', 'agro', 'plantation'],
            'Hospitality': ['hospitality', 'hotel', 'tourism', 'culinary'],
            'Sports': ['sports', 'sukan', 'fitness', 'physical education'],
        }
        
        for field, keywords in field_mappings.items():
            for keyword in keywords:
                if keyword in course_lower:
                    return field
        
        return "Other"


# Global instance
_translator_instance = None

def get_translator():
    """Get or create the global CourseTranslator instance"""
    global _translator_instance
    if _translator_instance is None:
        _translator_instance = CourseTranslator()
    return _translator_instance


if __name__ == "__main__":
    # Test the translator
    logging.basicConfig(level=logging.INFO)
    
    translator = CourseTranslator()
    
    print(f"\n📚 Loaded {translator.get_mapping_count()} course mappings\n")
    
    # Test cases
    test_courses = [
        "Diploma Sains Komputer",
        "Diploma Farmasi",
        "Sarjana Muda Kejuruteraan Awam (Kepujian)",
        "Diploma Perakaunan",
        "Dip. Sains Komputer",  # Abbreviation test
        "DIPLOMA FARMASI",  # Case test
        "Unknown Course"  # Not found test
    ]
    
    print("Translation Tests:")
    print("-" * 80)
    for course in test_courses:
        english = translator.translate(course)
        field = translator.map_to_field_category(english)
        print(f"Malay:   {course}")
        print(f"English: {english}")
        print(f"Field:   {field}")
        print("-" * 80)
