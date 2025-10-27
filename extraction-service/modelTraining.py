#!/usr/bin/env python3
"""
Step 3: Train Custom NER Model for Academic Transcripts
"""

import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import random
from pathlib import Path
import json
from collections import defaultdict

# Import your training data
try:
    from train_data import TRAIN_DATA
    print(f"✅ Loaded {len(TRAIN_DATA)} training examples")
except ImportError:
    print("❌ Error: train_data.py not found!")
    print("   Run Step 2 first to convert labeled data")
    exit(1)

def train_ner_model(
    train_data,
    output_dir="./custom_transcript_ner_model",
    n_iter=50,
    model=None,
    dropout=0.3
):
    """
    Train custom NER model
    
    Args:
        train_data: List of (text, {"entities": [(start, end, label)]}) tuples
        output_dir: Where to save the trained model
        n_iter: Number of training iterations
        model: Existing model to continue training (None = start from blank)
        dropout: Dropout rate for regularization
    """
    
    print("\n" + "=" * 60)
    print("🚀 TRAINING CUSTOM NER MODEL")
    print("=" * 60)
    
    # Create or load spaCy model
    if model is not None:
        nlp = spacy.load(model)
        print(f"📦 Loaded existing model: {model}")
    else:
        nlp = spacy.blank("en")
        print("📦 Created blank English model")
    
    # Add NER pipeline if not present
    if "ner" not in nlp.pipe_names:
        ner = nlp.add_pipe("ner")
        print("✅ Added NER pipeline component")
    else:
        ner = nlp.get_pipe("ner")
        print("✅ Using existing NER pipeline")
    
    # Add entity labels
    labels = set()
    for _, annotations in train_data:
        for _, _, label in annotations["entities"]:
            labels.add(label)
    
    for label in labels:
        ner.add_label(label)
    
    print(f"🏷️  Entity labels: {sorted(labels)}")
    print(f"📊 Training examples: {len(train_data)}")
    print(f"🔄 Training iterations: {n_iter}")
    
    # Prepare training data
    print("\n⚙️  Preparing training data...")
    examples = []
    for text, annotations in train_data:
        doc = nlp.make_doc(text)
        example = Example.from_dict(doc, annotations)
        examples.append(example)
    
    # Initialize model
    print("🔧 Initializing model...")
    nlp.initialize(lambda: examples)
    
    # Disable other pipeline components during training
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    
    print(f"\n🎯 Starting training...")
    print("-" * 60)
    
    # Training loop
    best_loss = float('inf')
    
    with nlp.disable_pipes(*other_pipes):
        for iteration in range(n_iter):
            random.shuffle(examples)
            losses = {}
            
            # Batch training
            batches = minibatch(examples, size=compounding(4.0, 32.0, 1.001))
            
            for batch in batches:
                nlp.update(batch, losses=losses, drop=dropout)
            
            # Track best loss
            current_loss = losses.get("ner", 0)
            if current_loss < best_loss:
                best_loss = current_loss
            
            # Print progress
            if (iteration + 1) % 5 == 0 or iteration == 0:
                print(f"Iteration {iteration + 1:3d}/{n_iter} | Loss: {current_loss:8.4f} | Best: {best_loss:8.4f}")
    
    print("-" * 60)
    print(f"✅ Training complete! Final loss: {current_loss:.4f}")
    
    # Save model
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    nlp.to_disk(output_path)
    
    # Calculate model size
    model_size = sum(f.stat().st_size for f in output_path.rglob('*') if f.is_file()) / 1024 / 1024
    
    print(f"\n💾 Model saved to: {output_path}")
    print(f"📦 Model size: {model_size:.1f} MB")
    
    # Save training metadata
    metadata = {
        "training_examples": len(train_data),
        "iterations": n_iter,
        "final_loss": float(current_loss),
        "best_loss": float(best_loss),
        "entity_labels": sorted(labels),
        "model_size_mb": round(model_size, 1)
    }
    
    with open(output_path / "training_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    return nlp

def evaluate_model_improved(model_path, test_data, match_type="strict"):
    """
    Evaluate trained model with proper precision, recall, and F1-score
    
    Args:
        model_path: Path to trained model
        test_data: List of (text, annotations) tuples
        match_type: "strict" (exact match), "partial" (overlap), or "token" (token-level)
    
    Returns:
        dict with overall and per-entity metrics
    """
    
    print("\n" + "=" * 60)
    print("🧪 EVALUATING MODEL (PROPER METRICS)")
    print("=" * 60)
    
    nlp = spacy.load(model_path)
    print(f"📦 Loaded model from: {model_path}")
    print(f"🎯 Match type: {match_type}")
    
    # Track metrics per entity type
    entity_metrics = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})
    
    print(f"\n📊 Evaluating on {len(test_data)} examples...")
    
    for text, annotations in test_data:
        doc = nlp(text)
        
        # Get ground truth entities
        true_entities = []
        for start, end, label in annotations["entities"]:
            true_entities.append({
                "start": start,
                "end": end,
                "label": label,
                "text": text[start:end]
            })
        
        # Get predicted entities
        pred_entities = []
        for ent in doc.ents:
            pred_entities.append({
                "start": ent.start_char,
                "end": ent.end_char,
                "label": ent.label_,
                "text": ent.text
            })
        
        # Match entities based on strategy
        matched_preds = set()
        matched_trues = set()
        
        for i, true_ent in enumerate(true_entities):
            for j, pred_ent in enumerate(pred_entities):
                if j in matched_preds:
                    continue
                
                # Check if entities match
                is_match = False
                
                if match_type == "strict":
                    # Exact boundary and label match
                    is_match = (
                        true_ent["start"] == pred_ent["start"] and
                        true_ent["end"] == pred_ent["end"] and
                        true_ent["label"] == pred_ent["label"]
                    )
                
                elif match_type == "partial":
                    # Any overlap with correct label
                    overlap = (
                        pred_ent["start"] < true_ent["end"] and
                        pred_ent["end"] > true_ent["start"]
                    )
                    is_match = overlap and (true_ent["label"] == pred_ent["label"])
                
                elif match_type == "token":
                    # Token-level matching (more complex, simplified here)
                    # Consider match if >50% overlap
                    overlap_start = max(true_ent["start"], pred_ent["start"])
                    overlap_end = min(true_ent["end"], pred_ent["end"])
                    
                    if overlap_end > overlap_start:
                        overlap_len = overlap_end - overlap_start
                        true_len = true_ent["end"] - true_ent["start"]
                        pred_len = pred_ent["end"] - pred_ent["start"]
                        
                        overlap_ratio = overlap_len / max(true_len, pred_len)
                        is_match = (
                            overlap_ratio > 0.5 and
                            true_ent["label"] == pred_ent["label"]
                        )
                
                if is_match:
                    # True Positive
                    entity_metrics[true_ent["label"]]["tp"] += 1
                    matched_preds.add(j)
                    matched_trues.add(i)
                    break
        
        # False Negatives: true entities not matched
        for i, true_ent in enumerate(true_entities):
            if i not in matched_trues:
                entity_metrics[true_ent["label"]]["fn"] += 1
        
        # False Positives: predicted entities not matched
        for j, pred_ent in enumerate(pred_entities):
            if j not in matched_preds:
                entity_metrics[pred_ent["label"]]["fp"] += 1
    
    # Calculate metrics
    print("\n" + "=" * 60)
    print("📈 RESULTS")
    print("=" * 60)
    
    overall_tp = sum(m["tp"] for m in entity_metrics.values())
    overall_fp = sum(m["fp"] for m in entity_metrics.values())
    overall_fn = sum(m["fn"] for m in entity_metrics.values())
    
    # Overall metrics
    overall_precision = overall_tp / (overall_tp + overall_fp) if (overall_tp + overall_fp) > 0 else 0
    overall_recall = overall_tp / (overall_tp + overall_fn) if (overall_tp + overall_fn) > 0 else 0
    overall_f1 = (
        2 * (overall_precision * overall_recall) / (overall_precision + overall_recall)
        if (overall_precision + overall_recall) > 0 else 0
    )
    
    print(f"\n🎯 Overall Metrics:")
    print(f"   Precision: {overall_precision * 100:5.2f}%")
    print(f"   Recall:    {overall_recall * 100:5.2f}%")
    print(f"   F1-Score:  {overall_f1 * 100:5.2f}%")
    print(f"\n   True Positives:  {overall_tp}")
    print(f"   False Positives: {overall_fp}")
    print(f"   False Negatives: {overall_fn}")
    
    # Per-entity metrics
    print(f"\n📊 Per-Entity Metrics:")
    print(f"{'Entity':<20} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'Support':>8}")
    print("-" * 60)
    
    per_entity_results = {}
    
    for label in sorted(entity_metrics.keys()):
        metrics = entity_metrics[label]
        tp, fp, fn = metrics["tp"], metrics["fp"], metrics["fn"]
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        support = tp + fn
        
        print(f"{label:<20} {precision*100:>9.2f}% {recall*100:>9.2f}% {f1*100:>9.2f}% {support:>8d}")
        
        per_entity_results[label] = {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "support": support,
            "tp": tp,
            "fp": fp,
            "fn": fn
        }
    
    print("-" * 60)
    
    return {
        "overall": {
            "precision": overall_precision,
            "recall": overall_recall,
            "f1": overall_f1,
            "tp": overall_tp,
            "fp": overall_fp,
            "fn": overall_fn
        },
        "per_entity": per_entity_results
    }


def compare_predictions_detailed(model_path, test_data, num_examples=5):
    """
    Show detailed comparison of predictions vs ground truth
    """
    
    print("\n" + "=" * 60)
    print("🔍 DETAILED PREDICTION COMPARISON")
    print("=" * 60)
    
    nlp = spacy.load(model_path)
    
    for idx, (text, annotations) in enumerate(test_data[:num_examples], 1):
        print(f"\n{'=' * 60}")
        print(f"Example {idx}:")
        print(f"{'=' * 60}")
        
        # Show text snippet
        text_preview = text[:200] + "..." if len(text) > 200 else text
        print(f"\nText: {text_preview}")
        
        doc = nlp(text)
        
        # Ground truth
        print(f"\n✓ Ground Truth:")
        for start, end, label in annotations["entities"]:
            entity_text = text[start:end]
            print(f"   [{label:15s}] ({start:4d}, {end:4d}): '{entity_text}'")
        
        # Predictions
        print(f"\n🤖 Model Predictions:")
        if doc.ents:
            for ent in doc.ents:
                print(f"   [{ent.label_:15s}] ({ent.start_char:4d}, {ent.end_char:4d}): '{ent.text}'")
        else:
            print("   (No entities predicted)")
        
        # Compare
        print(f"\n📊 Comparison:")
        true_set = {(start, end, label) for start, end, label in annotations["entities"]}
        pred_set = {(ent.start_char, ent.end_char, ent.label_) for ent in doc.ents}
        
        matches = true_set & pred_set
        missed = true_set - pred_set
        wrong = pred_set - true_set
        
        print(f"   ✓ Correct: {len(matches)}")
        print(f"   ✗ Missed:  {len(missed)}")
        print(f"   ⚠ Wrong:   {len(wrong)}")
        
        if missed:
            print(f"\n   Missed entities:")
            for start, end, label in missed:
                print(f"      [{label}]: '{text[start:end]}'")
        
        if wrong:
            print(f"\n   Wrong predictions:")
            for start, end, label in wrong:
                print(f"      [{label}]: '{text[start:end]}'")


def test_on_sample(model_path):
    """
    Test model on sample text
    """
    print("\n" + "=" * 60)
    print("🧪 TESTING ON SAMPLE DATA")
    print("=" * 60)
    
    nlp = spacy.load(model_path)
    
    # Sample test cases
    test_cases = [
        "NAME\nAhmad Bin Abdullah\nGENDER\nMale",
        "FINAL CGPA\n3.85\nCOMPLETED IN 2023",
        "PROGRAM\nBachelor of Computer Science and Mathematics",
        "STUDENT ID: 20230012345\nINTAKE: JAN 2023"
    ]
    
    print("\n📋 Test Results:")
    print("-" * 60)
    
    for i, text in enumerate(test_cases, 1):
        print(f"\n{i}. Text: {text[:50]}{'...' if len(text) > 50 else ''}")
        
        doc = nlp(text)
        
        if doc.ents:
            for ent in doc.ents:
                print(f"   ✓ [{ent.label_}]: '{ent.text}'")
        else:
            print("   ✗ No entities found")
    
    print("-" * 60)


if __name__ == "__main__":
    print("=" * 60)
    print("STEP 3: TRAIN CUSTOM NER MODEL")
    print("=" * 60)
    
    # Configuration
    OUTPUT_DIR = "./custom_transcript_ner_model"
    N_ITERATIONS = 50  # Increase for better accuracy (try 100-200)
    
    # Train model
    trained_model = train_ner_model(
        train_data=TRAIN_DATA,
        output_dir=OUTPUT_DIR,
        n_iter=N_ITERATIONS,
        model=None,  # Start from blank, or use "en_core_web_sm" to continue training
        dropout=0.3
    )
    
    # Evaluate with proper metrics
    print("\n" + "=" * 60)
    print("📊 EVALUATING MODEL PERFORMANCE")
    print("=" * 60)
    
    try:
        from test_data import TEST_DATA
        if len(TEST_DATA) > 0:
            print(f"\n✅ Found {len(TEST_DATA)} test examples")
            
            # Strict evaluation
            print("\n" + "=" * 60)
            print("STRICT MATCHING (Exact boundaries)")
            print("=" * 60)
            results_strict = evaluate_model_improved(
                model_path=OUTPUT_DIR,
                test_data=TEST_DATA,
                match_type="strict"
            )
            
            # Partial evaluation (more forgiving)
            print("\n" + "=" * 60)
            print("PARTIAL MATCHING (Any overlap)")
            print("=" * 60)
            results_partial = evaluate_model_improved(
                model_path=OUTPUT_DIR,
                test_data=TEST_DATA,
                match_type="partial"
            )
            
            # Show detailed comparison for first few examples
            compare_predictions_detailed(
                model_path=OUTPUT_DIR,
                test_data=TEST_DATA,
                num_examples=3
            )
        else:
            print("\n⚠️  TEST_DATA is empty")
    except ImportError:
        print("\n⚠️  No test_data.py found, evaluating on training data (not recommended)")
        print("   Tip: Create test_data.py with separate test examples for proper evaluation")
        
        # Fallback: evaluate on a small subset of training data
        test_subset = TRAIN_DATA[:3]
        results = evaluate_model_improved(
            model_path=OUTPUT_DIR,
            test_data=test_subset,
            match_type="strict"
        )
        
        compare_predictions_detailed(
            model_path=OUTPUT_DIR,
            test_data=test_subset,
            num_examples=2
        )
    
    # Test on samples
    test_on_sample(OUTPUT_DIR)
    
    print("\n" + "=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("=" * 60)
    print(f"\n📦 Model saved to: {OUTPUT_DIR}")
    print("\n📝 Next Steps:")
    print("1. Review the Precision, Recall, and F1-Score above")
    print("2. Check per-entity performance - which entities need improvement?")
    print("3. If F1-Score < 80%: Label more training data and retrain")
    print("4. If F1-Score > 85%: Ready to integrate with production service!")
    print("5. Create test_data.py with separate test examples if not done yet")
    print("\n💡 Tips:")
    print("   - Precision low? Model predicting too many wrong entities")
    print("   - Recall low? Model missing entities it should find")
    print("   - F1-Score balances both precision and recall")
    print("=" * 60)