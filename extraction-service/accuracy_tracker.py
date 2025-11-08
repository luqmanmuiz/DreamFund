#!/usr/bin/env python3
"""
Real-Time Accuracy Tracking
Track model accuracy on production data with user corrections
"""

import json
from pathlib import Path
from datetime import datetime
import spacy

class AccuracyTracker:
    """Track and measure accuracy over time"""
    
    def __init__(self, log_file="./accuracy_log.jsonl"):
        self.log_file = Path(log_file)
        
    def log_prediction(self, file_name, predicted, ground_truth=None, user_verified=False):
        """
        Log a prediction for later accuracy calculation
        
        Args:
            file_name: Name of the file processed
            predicted: Dictionary with model's predictions
            ground_truth: Dictionary with correct values (if known)
            user_verified: Whether user has verified/corrected the prediction
        """
        entry = {
            'timestamp': datetime.now().isoformat(),
            'file_name': file_name,
            'predicted': predicted,
            'ground_truth': ground_truth,
            'user_verified': user_verified
        }
        
        # Append to log file
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry) + '\n')
    
    def calculate_running_accuracy(self):
        """Calculate accuracy from all logged predictions"""
        
        if not self.log_file.exists():
            print("No accuracy log found")
            return None
        
        # Read all entries
        entries = []
        with open(self.log_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entries.append(json.loads(line))
        
        # Filter only verified entries
        verified = [e for e in entries if e.get('ground_truth') is not None]
        
        if len(verified) == 0:
            print(f"Found {len(entries)} predictions but none verified yet")
            return None
        
        # Calculate accuracy
        results = {
            'name': {'correct': 0, 'total': 0},
            'cgpa': {'correct': 0, 'total': 0},
            'program': {'correct': 0, 'total': 0}
        }
        
        for entry in verified:
            pred = entry['predicted']
            truth = entry['ground_truth']
            
            for field in ['name', 'cgpa', 'program']:
                if field in truth and truth[field] is not None:
                    results[field]['total'] += 1
                    
                    # Normalize for comparison
                    pred_val = str(pred.get(field, '')).upper().strip()
                    truth_val = str(truth[field]).upper().strip()
                    
                    if pred_val == truth_val or pred_val in truth_val:
                        results[field]['correct'] += 1
        
        # Print results
        print("=" * 60)
        print("PRODUCTION ACCURACY (User-Verified Data)")
        print("=" * 60)
        print(f"Total predictions: {len(entries)}")
        print(f"User-verified: {len(verified)}")
        print()
        
        overall_correct = 0
        overall_total = 0
        
        for field in ['name', 'cgpa', 'program']:
            total = results[field]['total']
            correct = results[field]['correct']
            
            if total > 0:
                accuracy = correct / total * 100
                print(f"{field.upper()}: {correct}/{total} ({accuracy:.1f}% accurate)")
                overall_correct += correct
                overall_total += total
        
        if overall_total > 0:
            overall_acc = overall_correct / overall_total * 100
            print(f"\nOVERALL: {overall_correct}/{overall_total} ({overall_acc:.1f}% accurate)")
        
        print("=" * 60)
        
        return results
    
    def get_accuracy_over_time(self):
        """Show how accuracy changes over time"""
        
        if not self.log_file.exists():
            return None
        
        entries = []
        with open(self.log_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entry = json.loads(line)
                    if entry.get('ground_truth') is not None:
                        entries.append(entry)
        
        if len(entries) < 10:
            print(f"Not enough verified data yet ({len(entries)}/10 minimum)")
            return None
        
        # Calculate accuracy in windows of 10
        window_size = 10
        print("\nAccuracy Over Time (10-prediction windows):")
        print("-" * 60)
        
        for i in range(0, len(entries), window_size):
            window = entries[i:i+window_size]
            
            correct = 0
            total = 0
            
            for entry in window:
                pred = entry['predicted']
                truth = entry['ground_truth']
                
                for field in ['name', 'cgpa', 'program']:
                    if field in truth and truth[field]:
                        total += 1
                        pred_val = str(pred.get(field, '')).upper().strip()
                        truth_val = str(truth[field]).upper().strip()
                        
                        if pred_val == truth_val or pred_val in truth_val:
                            correct += 1
            
            if total > 0:
                accuracy = correct / total * 100
                window_num = i // window_size + 1
                print(f"Window {window_num:2d}: {correct:2d}/{total:2d} ({accuracy:5.1f}%)")


# Integration example
def example_usage():
    """Example: How to integrate with your extraction service"""
    
    tracker = AccuracyTracker()
    
    # When user uploads and extracts
    predicted = {
        'name': 'JOHN DOE',
        'cgpa': '3.75',
        'program': 'DIPLOMA SAINS KOMPUTER'
    }
    
    # Log the prediction (no ground truth yet)
    tracker.log_prediction(
        file_name='transcript_123.pdf',
        predicted=predicted
    )
    
    # Later: User corrects/verifies the extraction
    ground_truth = {
        'name': 'JOHN DOE',  # Correct
        'cgpa': '3.78',       # User corrected
        'program': 'DIPLOMA SAINS KOMPUTER'  # Correct
    }
    
    tracker.log_prediction(
        file_name='transcript_123.pdf',
        predicted=predicted,
        ground_truth=ground_truth,
        user_verified=True
    )
    
    # Check accuracy
    tracker.calculate_running_accuracy()
    tracker.get_accuracy_over_time()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'demo':
        print("Running demo...")
        example_usage()
    else:
        # Calculate accuracy from existing log
        tracker = AccuracyTracker()
        tracker.calculate_running_accuracy()
        tracker.get_accuracy_over_time()
