#!/usr/bin/env python3
"""
Step 1: Prepare transcript data for labeling
Run this first to extract text from PDFs
"""

import os
import json
from pathlib import Path
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    from pypdf import PdfReader

def extract_text_from_pdf(pdf_path):
    """Extract text from a PDF file"""
    try:
        if HAS_PYMUPDF:
            with fitz.open(pdf_path) as doc:
                text = ""
                for page in doc:
                    text += page.get_text()
            return text
        else:
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
    except Exception as e:
        print(f"Error extracting {pdf_path}: {e}")
        return None

def prepare_for_labeling(transcripts_folder, output_folder):
    """
    Extract text from all PDFs and prepare for Label Studio
    """
    transcripts_path = Path(transcripts_folder)
    output_path = Path(output_folder)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Find all PDF files
    pdf_files = list(transcripts_path.glob("*.pdf"))
    print(f"📄 Found {len(pdf_files)} PDF files")
    
    if len(pdf_files) == 0:
        print("❌ No PDF files found!")
        print(f"   Make sure PDFs are in: {transcripts_path.absolute()}")
        return
    
    # Extract text from each PDF
    extracted_data = []
    
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"Processing {i}/{len(pdf_files)}: {pdf_file.name}")
        
        text = extract_text_from_pdf(pdf_file)
        
        if text:
            # Save as JSON for Label Studio
            data_entry = {
                "id": i,
                "text": text,
                "meta": {
                    "filename": pdf_file.name
                }
            }
            extracted_data.append(data_entry)
            
            # Also save individual text files for manual checking
            text_file = output_path / f"{pdf_file.stem}.txt"
            with open(text_file, 'w', encoding='utf-8') as f:
                f.write(text)
    
    # Save as JSON for Label Studio import
    json_file = output_path / "transcripts_for_labeling.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(extracted_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Extracted {len(extracted_data)} transcripts")
    print(f"📁 Text files saved to: {output_path}")
    print(f"📋 JSON file for Label Studio: {json_file}")
    print(f"\n📊 Statistics:")
    print(f"   Total files: {len(extracted_data)}")
    print(f"   Avg length: {sum(len(d['text']) for d in extracted_data) / len(extracted_data):.0f} characters")
    
    return extracted_data

if __name__ == "__main__":
    # Configuration
    TRANSCRIPTS_FOLDER = "./transcripts"  # Folder with your PDF files
    OUTPUT_FOLDER = "./extracted_texts"    # Where to save extracted text
    
    print("=" * 60)
    print("STEP 1: Prepare Data for Labeling")
    print("=" * 60)
    print(f"\n📂 Looking for PDFs in: {TRANSCRIPTS_FOLDER}")
    print(f"💾 Will save to: {OUTPUT_FOLDER}\n")
    
    # Create folders if they don't exist
    Path(TRANSCRIPTS_FOLDER).mkdir(exist_ok=True)
    
    # Extract and prepare
    data = prepare_for_labeling(TRANSCRIPTS_FOLDER, OUTPUT_FOLDER)
    
    if data:
        print("\n" + "=" * 60)
        print("✅ PREPARATION COMPLETE!")
        print("=" * 60)
        print("\n📝 Next Steps:")
        print(".\venv\Scripts\Activate.ps1")
        print("1. Check the extracted text files in './extracted_texts/'")
        print("2. Install Label Studio: pip install label-studio")
        print("3. Run Label Studio: label-studio start")
        print("4. Import 'transcripts_for_labeling.json' into Label Studio")
        print("5. Start labeling!")
        print("=" * 60)