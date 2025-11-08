#!/usr/bin/env python3
"""
Step 3: Train Custom NER Model with Train-Test Split
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

def split_train_test(data, test_size=0.2, random_seed=42):
    """
    Split data into training and testing sets
    
    Args:
        data: List of training examples
        test_size: Proportion of data to use for testing (default 20%)
        random_seed: Random seed for reproducibility
    
    Returns:
        train_data, test_data
    """
    random.seed(random_seed)
    
    # Shuffle data
    shuffled = data.copy()
    random.shuffle(shuffled)
    
    # Calculate split point
    split_idx = int(len(shuffled) * (1 - test_size))
    
    train_data = shuffled[:split_idx]
    test_data = shuffled[split_idx:]
    
    print(f"\n📊 Data Split:")
    print(f"   Training set: {len(train_data)} documents ({(1-test_size)*100:.0f}%)")
    print(f"   Test set:     {len(test_data)} documents ({test_size*100:.0f}%)")
    
    return train_data, test_data

def evaluate_model(nlp, test_data):
    """
    Evaluate model on test data
    
    Returns:
        dict with precision, recall, f1-score per entity
    """
    from spacy.scorer import Scorer
    
    scorer = Scorer()
    examples = []
    
    for text, annotations in test_data:
        doc = nlp.make_doc(text)
        example = Example.from_dict(doc, annotations)
        examples.append(example)
    
    scores = scorer.score(examples)
    
    return scores

def train_ner_model(
    train_data,
    test_data=None,
    output_dir="./custom_transcript_ner_model",
    n_iter=100,
    model=None,
    dropout=0.2
):
    """
    Train custom NER model with evaluation on test set
    
    Args:
        train_data: Training examples
        test_data: Test examples (for evaluation)
        output_dir: Where to save the trained model
        n_iter: Number of training iterations (increased to 100)
        model: Existing model to continue training (None = start from blank)
        dropout: Dropout rate for regularization (reduced to 0.2)
    """
    
    print("\n" + "=" * 60)
    print("🚀 TRAINING CUSTOM NER MODEL WITH VALIDATION")
    print("=" * 60)
    
    # Check dataset size
    if len(train_data) < 20:
        print(f"⚠️  WARNING: Only {len(train_data)} training examples!")
        print(f"   Recommended: 50+ examples for good accuracy")
        print(f"   Model may overfit with this small dataset\n")
    
    # Create or load spaCy model
    if model is not None:
        nlp = spacy.load(model)
        print(f"📦 Loaded existing model: {model}")
    else:
        nlp = spacy.blank("en")
        print(f"📦 Creating blank English model...")
        # Add tokenizer with better handling
        nlp.tokenizer.token_match = None
    
    # Add NER component
    if "ner" not in nlp.pipe_names:
        ner = nlp.add_pipe("ner", last=True)
        print(f"🏷️  Adding NER component...")
    else:
        ner = nlp.get_pipe("ner")
        print(f"🏷️  Using existing NER component...")
    
    # Add entity labels
    labels = set()
    for text, annotations in train_data:
        for start, end, label in annotations.get("entities", []):
            labels.add(label)
            ner.add_label(label)
    
    print(f"📊 Labels to train: {sorted(labels)}")
    
    # Train the model
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    
    print(f"\n🎯 Training for {n_iter} iterations...")
    print(f"   Dropout rate: {dropout}")
    print(f"   Batch size: dynamic (4-32)")
    print("-" * 60)
    
    best_loss = float('inf')
    best_test_score = 0.0
    patience = 0
    max_patience = 20  # Early stopping if no improvement
    
    with nlp.disable_pipes(*other_pipes):
        optimizer = nlp.begin_training()
        
        # Set learning rate
        optimizer.learn_rate = 0.001
        
        for iteration in range(n_iter):
            random.shuffle(train_data)
            losses = {}
            
            # Create training examples
            examples = []
            for text, annotations in train_data:
                doc = nlp.make_doc(text)
                example = Example.from_dict(doc, annotations)
                examples.append(example)
            
            # Batch training with smaller batches for small datasets
            batch_size = min(8.0, len(train_data) / 2)  # Smaller batches
            batches = minibatch(examples, size=compounding(2.0, batch_size, 1.001))
            
            for batch in batches:
                nlp.update(batch, losses=losses, drop=dropout)
            
            # Track training loss
            current_loss = losses.get("ner", 0)
            if current_loss < best_loss:
                best_loss = current_loss
                patience = 0
            else:
                patience += 1
            
            # Early stopping
            if patience > max_patience:
                print(f"\n⚠️  Early stopping at iteration {iteration + 1} (no improvement for {max_patience} iterations)")
                break
            
            # Evaluate on test set every 10 iterations
            if test_data and (iteration + 1) % 10 == 0:
                scores = evaluate_model(nlp, test_data)
                test_f1 = scores.get("ents_f", 0.0) * 100
                
                if test_f1 > best_test_score:
                    best_test_score = test_f1
                
                print(f"Iteration {iteration + 1:3d}/{n_iter} | "
                      f"Train Loss: {current_loss:8.4f} | "
                      f"Test F1: {test_f1:5.2f}% | "
                      f"Best: {best_test_score:5.2f}%")
            elif (iteration + 1) % 5 == 0 or iteration == 0:
                print(f"Iteration {iteration + 1:3d}/{n_iter} | "
                      f"Loss: {current_loss:8.4f} | "
                      f"Best: {best_loss:8.4f}")
    
    print("-" * 60)
    print(f"✅ Training complete!")
    
    # Final evaluation on test set
    if test_data:
        print("\n" + "=" * 60)
        print("📊 FINAL EVALUATION ON TEST SET")
        print("=" * 60)
        
        scores = evaluate_model(nlp, test_data)
        
        print(f"\n🎯 Overall Metrics:")
        print(f"   Precision: {scores.get('ents_p', 0) * 100:.2f}%")
        print(f"   Recall:    {scores.get('ents_r', 0) * 100:.2f}%")
        print(f"   F1-Score:  {scores.get('ents_f', 0) * 100:.2f}%")
        
        # Per-entity scores
        if 'ents_per_type' in scores:
            print(f"\n📋 Per-Entity Performance:")
            for entity, entity_scores in scores['ents_per_type'].items():
                print(f"   {entity}:")
                print(f"      Precision: {entity_scores.get('p', 0) * 100:.2f}%")
                print(f"      Recall:    {entity_scores.get('r', 0) * 100:.2f}%")
                print(f"      F1-Score:  {entity_scores.get('f', 0) * 100:.2f}%")
    
    # Save model
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    nlp.to_disk(output_path)
    
    # Calculate model size
    model_size = sum(f.stat().st_size for f in output_path.rglob('*') if f.is_file()) / 1024 / 1024
    
    print(f"\n💾 Model saved to: {output_path}")
    print(f"📦 Model size: {model_size:.1f} MB")
    
    # Save training metadata with test scores
    metadata = {
        "training_examples": len(train_data),
        "test_examples": len(test_data) if test_data else 0,
        "iterations": n_iter,
        "final_train_loss": float(current_loss),
        "best_train_loss": float(best_loss),
        "test_f1_score": scores.get('ents_f', 0) * 100 if test_data else None,
        "test_precision": scores.get('ents_p', 0) * 100 if test_data else None,
        "test_recall": scores.get('ents_r', 0) * 100 if test_data else None,
        "entity_labels": sorted(labels),
        "model_size_mb": round(model_size, 1),
        "dropout": dropout
    }
    
    with open(output_path / "training_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("\n" + "=" * 60)
    print("✅ MODEL TRAINING COMPLETE!")
    print("=" * 60)
    
    if test_data:
        print(f"\n⚠️  IMPORTANT:")
        print(f"   Training F1: ~{best_loss:.2f} (may be optimistic)")
        print(f"   Test F1:     {scores.get('ents_f', 0) * 100:.2f}% (real performance)")
        print(f"   Use the TEST score to evaluate model quality!")

if __name__ == "__main__":
    # Check dataset size
    print(f"\n📊 Dataset Information:")
    print(f"   Total examples: {len(TRAIN_DATA)}")
    
    if len(TRAIN_DATA) < 30:
        print(f"\n⚠️  DATASET TOO SMALL!")
        print(f"   Current: {len(TRAIN_DATA)} examples")
        print(f"   Recommended: 50+ examples")
        print(f"   Optimal: 100+ examples")
        print(f"\n   With only {len(TRAIN_DATA)} examples, accuracy will be limited.")
        print(f"   Consider labeling more transcripts for better results.\n")
        
        response = input("Continue training anyway? (y/n): ")
        if response.lower() != 'y':
            print("Training cancelled. Label more data and try again.")
            exit(0)
    
    # Split data into train and test
    train_data, test_data = split_train_test(TRAIN_DATA, test_size=0.2)
    
    # Train the model with validation
    train_ner_model(
        train_data=train_data,
        test_data=test_data,
        output_dir="./custom_transcript_ner_model",
        n_iter=100,  # Increased iterations
        dropout=0.2   # Reduced dropout
    )