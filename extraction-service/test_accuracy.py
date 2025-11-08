#!/usr/bin/env python3
"""
Test Accuracy on Test Data
Evaluates the custom NER model against test_data.py
"""

import spacy
from test_data import TEST_DATA
from collections import defaultdict

def calculate_accuracy(nlp, test_data):
    """
    Calculate accuracy metrics on test data.
    Returns precision, recall, F1 per entity type and overall.
    """
    
    # Track metrics per entity type
    metrics = {
        'STUDENT_NAME': {'correct': 0, 'predicted': 0, 'expected': 0},
        'CGPA': {'correct': 0, 'predicted': 0, 'expected': 0},
        'PROGRAM': {'correct': 0, 'predicted': 0, 'expected': 0}
    }
    
    total_correct = 0
    total_predicted = 0
    total_expected = 0
    
    print("="*80)
    print("TESTING MODEL ON TEST DATA")
    print("="*80)
    print(f"Model: {nlp.meta['name']}")
    print(f"Test examples: {len(test_data)}")
    print()
    
    # Process each test example
    for idx, (text, annotations) in enumerate(test_data, 1):
        # Get ground truth
        expected_entities = {}
        for start, end, label in annotations['entities']:
            expected_entities[label] = text[start:end].strip()
            metrics[label]['expected'] += 1
            total_expected += 1
        
        # Get predictions
        doc = nlp(text)
        predicted_entities = {}
        for ent in doc.ents:
            if ent.label_ not in predicted_entities:  # Take first occurrence
                predicted_entities[ent.label_] = ent.text.strip()
                metrics[ent.label_]['predicted'] += 1
                total_predicted += 1
        
        # Compare and count matches
        print(f"Example {idx}:")
        for label in ['STUDENT_NAME', 'CGPA', 'PROGRAM']:
            expected = expected_entities.get(label, None)
            predicted = predicted_entities.get(label, None)
            
            # Check if match (exact or close enough)
            is_match = False
            if expected and predicted:
                # Exact match
                if expected == predicted:
                    is_match = True
                # Close match (allow minor whitespace differences)
                elif expected.replace(' ', '') == predicted.replace(' ', ''):
                    is_match = True
                # Contains match (predicted contains expected or vice versa)
                elif expected in predicted or predicted in expected:
                    is_match = True
            
            if is_match:
                metrics[label]['correct'] += 1
                total_correct += 1
                status = "✓"
            else:
                status = "✗"
            
            print(f"  {label:15s} {status}")
            if expected:
                print(f"    Expected:  '{expected}'")
            else:
                print(f"    Expected:  (none)")
            if predicted:
                print(f"    Predicted: '{predicted}'")
            else:
                print(f"    Predicted: (none)")
        print()
    
    print("="*80)
    print("ACCURACY RESULTS")
    print("="*80)
    print()
    
    # Calculate per-entity metrics
    for label in ['STUDENT_NAME', 'CGPA', 'PROGRAM']:
        correct = metrics[label]['correct']
        predicted = metrics[label]['predicted']
        expected = metrics[label]['expected']
        
        # Precision: Of all predicted, how many were correct?
        precision = (correct / predicted * 100) if predicted > 0 else 0
        
        # Recall: Of all expected, how many did we find?
        recall = (correct / expected * 100) if expected > 0 else 0
        
        # F1: Harmonic mean of precision and recall
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0
        
        print(f"{label}:")
        print(f"  Correct:   {correct}/{expected}")
        print(f"  Precision: {precision:.1f}%")
        print(f"  Recall:    {recall:.1f}%")
        print(f"  F1 Score:  {f1:.1f}%")
        print()
    
    # Calculate overall metrics
    overall_precision = (total_correct / total_predicted * 100) if total_predicted > 0 else 0
    overall_recall = (total_correct / total_expected * 100) if total_expected > 0 else 0
    overall_f1 = (2 * overall_precision * overall_recall / (overall_precision + overall_recall)) if (overall_precision + overall_recall) > 0 else 0
    
    print("-"*80)
    print("OVERALL:")
    print(f"  Correct:   {total_correct}/{total_expected}")
    print(f"  Precision: {overall_precision:.1f}%")
    print(f"  Recall:    {overall_recall:.1f}%")
    print(f"  F1 Score:  {overall_f1:.1f}%")
    print()
    
    # Interpretation
    print("="*80)
    print("INTERPRETATION")
    print("="*80)
    if overall_f1 >= 90:
        print("🎉 EXCELLENT: Model performs very well!")
        print("   Ready for production use.")
    elif overall_f1 >= 70:
        print("✅ GOOD: Model is production-ready.")
        print("   Continue monitoring and labeling edge cases.")
    elif overall_f1 >= 50:
        print("⚠️  FAIR: Model works but needs improvement.")
        print("   Recommend labeling more training data (target: 50-100 examples).")
    else:
        print("❌ POOR: Model needs significant improvement.")
        print("   Action: Review labels, add more training data, or tune parameters.")
    
    print()
    print("="*80)
    
    return {
        'overall': {
            'precision': overall_precision,
            'recall': overall_recall,
            'f1': overall_f1,
            'correct': total_correct,
            'total': total_expected
        },
        'per_entity': {
            label: {
                'precision': (metrics[label]['correct'] / metrics[label]['predicted'] * 100) if metrics[label]['predicted'] > 0 else 0,
                'recall': (metrics[label]['correct'] / metrics[label]['expected'] * 100) if metrics[label]['expected'] > 0 else 0,
                'f1': (2 * (metrics[label]['correct'] / metrics[label]['predicted'] * 100) * (metrics[label]['correct'] / metrics[label]['expected'] * 100) / ((metrics[label]['correct'] / metrics[label]['predicted'] * 100) + (metrics[label]['correct'] / metrics[label]['expected'] * 100))) if metrics[label]['predicted'] > 0 and metrics[label]['expected'] > 0 else 0,
                'correct': metrics[label]['correct'],
                'total': metrics[label]['expected']
            }
            for label in ['STUDENT_NAME', 'CGPA', 'PROGRAM']
        }
    }


def main():
    """Main function"""
    print()
    print("Loading model...")
    
    try:
        nlp = spacy.load("./custom_transcript_ner_model")
        print(f"✓ Loaded: custom_transcript_ner_model")
    except:
        print("❌ Could not load custom_transcript_ner_model")
        print("   Make sure the model exists in the current directory.")
        return
    
    print()
    
    # Run accuracy test
    results = calculate_accuracy(nlp, TEST_DATA)
    
    # Save results to JSON
    import json
    with open('test_accuracy_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("✓ Results saved to test_accuracy_results.json")
    print()


if __name__ == "__main__":
    main()
