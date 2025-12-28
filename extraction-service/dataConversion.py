#!/usr/bin/env python3
"""
Step 2: Convert Label Studio export to spaCy training format
"""

import json
from pathlib import Path

def convert_labelstudio_to_spacy(labelstudio_file, output_file):
    """
    Convert Label Studio JSON export to spaCy training format
    """
    print("Converting Label Studio data to spaCy format...")
    
    # Load Label Studio export
    with open(labelstudio_file, 'r', encoding='utf-8') as f:
        labelstudio_data = json.load(f)
    
    print(f"Loaded {len(labelstudio_data)} labeled transcripts")
    
    # Convert to spaCy format
    training_data = []
    skipped = 0
    
    for item in labelstudio_data:
        try:
            # Get text
            text = item['data']['text']
            
            # Get annotations
            if 'annotations' not in item or len(item['annotations']) == 0:
                skipped += 1
                continue
            
            annotation = item['annotations'][0]  # Use first annotation
            results = annotation.get('result', [])
            
            # Extract entities
            entities = []
            for result in results:
                if result['type'] == 'labels':
                    entity_text = result['value']['text']
                    entity_label = result['value']['labels'][0]
                    start = result['value']['start']
                    end = result['value']['end']
                    
                    entities.append((start, end, entity_label))
            
            # Add to training data
            if entities:
                training_data.append((text, {"entities": entities}))
            else:
                skipped += 1
                
        except Exception as e:
            print(f"Error processing item: {e}")
            skipped += 1
            continue
    
    print(f"\nConverted {len(training_data)} transcripts")
    if skipped > 0:
        print(f"Skipped {skipped} transcripts")
    
    # Save as Python file
    output_path = Path(output_file)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# Training data in spaCy format\n")
        f.write("# Auto-generated from Label Studio export\n\n")
        f.write("TRAIN_DATA = [\n")
        
        for text, annotations in training_data:
            # Escape special characters
            text_escaped = text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            f.write(f'    ("{text_escaped}", {annotations}),\n')
        
        f.write("]\n")
    
    # Count entities by type
    entity_counts = {}
    for _, annotations in training_data:
        for _, _, label in annotations['entities']:
            entity_counts[label] = entity_counts.get(label, 0) + 1
    
    print(f"\nEntity counts: {dict(sorted(entity_counts.items()))}")
    
    return training_data

def split_train_test(training_data, test_size=0.2):
    """Split data into training and testing sets"""
    import random
    
    random.shuffle(training_data)
    split_index = int(len(training_data) * (1 - test_size))
    
    train_data = training_data[:split_index]
    test_data = training_data[split_index:]
    
    print(f"\nData Split: {len(train_data)} training, {len(test_data)} testing")
    
    return train_data, test_data

if __name__ == "__main__":
    # Configuration
    LABELSTUDIO_FILE = "./exported_data/labeled_data.json"  # From Label Studio export
    OUTPUT_FILE = "./train_data.py"
    
    print("\n" + "=" * 60)
    print("Convert Labeled Data to spaCy Format")
    print("=" * 60)
    
    # Check if input file exists
    if not Path(LABELSTUDIO_FILE).exists():
        print(f"Error: File not found: {LABELSTUDIO_FILE}")
        print("Please export labeled data from Label Studio to './exported_data/labeled_data.json'")
        exit(1)
    
    # Convert data
    training_data = convert_labelstudio_to_spacy(LABELSTUDIO_FILE, OUTPUT_FILE)
    
    # Split into train/test
    if len(training_data) > 10:
        train_data, test_data = split_train_test(training_data, test_size=0.2)
        
        # Save split data separately
        with open("./train_data.py", 'w', encoding='utf-8') as f:
            f.write("TRAIN_DATA = [\n")
            for text, annotations in train_data:
                text_escaped = text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                f.write(f'    ("{text_escaped}", {annotations}),\n')
            f.write("]\n")
        
        with open("./test_data.py", 'w', encoding='utf-8') as f:
            f.write("TEST_DATA = [\n")
            for text, annotations in test_data:
                text_escaped = text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                f.write(f'    ("{text_escaped}", {annotations}),\n')
            f.write("]\n")
        
        print(f"\nSaved: train_data.py ({len(train_data)} examples), test_data.py ({len(test_data)} examples)")
    
    print("\n" + "=" * 60)
    print("Conversion complete. Run 'python modelTraining.py' to train.")
    print("=" * 60)