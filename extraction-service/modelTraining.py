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

# Import your training data
try:
    from train_data import TRAIN_DATA
    from test_data import TEST_DATA
except ImportError:
    print("Error: train_data.py not found!")
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
    
    shuffled = data.copy()
    random.shuffle(shuffled)
    
    split_idx = int(len(shuffled) * (1 - test_size))
    
    train_data = shuffled[:split_idx]
    test_data = shuffled[split_idx:]
    
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
        doc = nlp(text)
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
        n_iter: Number of training iterations
        model: Existing model to continue training (None = start from blank)
        dropout: Dropout rate for regularization
    """
    
    # Create or load spaCy model
    if model is not None:
        nlp = spacy.load(model)
    else:
        nlp = spacy.blank("en")
    
    # Add NER component
    if "ner" not in nlp.pipe_names:
        ner = nlp.add_pipe("ner", last=True)
    else:
        ner = nlp.get_pipe("ner")
    
    # Add entity labels
    labels = set()
    for text, annotations in train_data:
        for start, end, label in annotations.get("entities", []):
            labels.add(label)
            ner.add_label(label)
    
    # Train the model
    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
    
    best_loss = float('inf')
    best_test_score = 0.0
    patience = 0
    max_patience = 20
    
    with nlp.disable_pipes(*other_pipes):
        optimizer = nlp.begin_training()
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
            
            # Batch training
            batch_size = min(8.0, len(train_data) / 2)
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
                print(f"\nEarly stopping at iteration {iteration + 1}")
                break
            
            # Evaluate on test set every 10 iterations
            if test_data and (iteration + 1) % 10 == 0:
                scores = evaluate_model(nlp, test_data)
                test_f1 = scores.get("ents_f", 0.0) * 100
                
                if test_f1 > best_test_score:
                    best_test_score = test_f1
                
                print(f"Iteration {iteration + 1:3d}/{n_iter} | "
                      f"Loss: {current_loss:8.4f} | "
                      f"F1: {test_f1:5.2f}%")
            elif (iteration + 1) % 5 == 0 or iteration == 0:
                print(f"Iteration {iteration + 1:3d}/{n_iter} | Loss: {current_loss:8.4f}")
    
    # Final evaluation on test set
    if test_data:
        scores = evaluate_model(nlp, test_data)
        
        print(f"\nFinal Results:")
        print(f"  Precision: {scores.get('ents_p', 0) * 100:.2f}%")
        print(f"  Recall:    {scores.get('ents_r', 0) * 100:.2f}%")
        print(f"  F1-Score:  {scores.get('ents_f', 0) * 100:.2f}%")
    
    # Save model
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    nlp.to_disk(output_path)
    
    print(f"\nModel saved to: {output_path}")
    
    # Save training metadata
    metadata = {
        "training_examples": len(train_data),
        "test_examples": len(test_data) if test_data else 0,
        "iterations": iteration + 1,
        "final_train_loss": float(current_loss),
        "best_train_loss": float(best_loss),
        "test_f1_score": scores.get('ents_f', 0) * 100 if test_data else None,
        "test_precision": scores.get('ents_p', 0) * 100 if test_data else None,
        "test_recall": scores.get('ents_r', 0) * 100 if test_data else None,
        "entity_labels": sorted(labels),
        "dropout": dropout,
        "learning_rate": 0.001
    }
    
    with open(output_path / "training_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)

if __name__ == "__main__":
    # Import test data
    try:
        from test_data import TEST_DATA
    except ImportError:
        TEST_DATA = None
    
    # Use pre-split data if available
    if TEST_DATA:
        train_data = TRAIN_DATA
        test_data = TEST_DATA
    else:
        train_data, test_data = split_train_test(TRAIN_DATA, test_size=0.2)
    
    # Train the model
    train_ner_model(
        train_data=train_data,
        test_data=test_data,
        output_dir="./custom_transcript_ner_model",
        n_iter=100,
        dropout=0.2
    )