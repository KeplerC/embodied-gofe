#!/usr/bin/env python3
import os
import json
import argparse
import csv
from flask import Flask, render_template, jsonify, request, abort, send_from_directory
from pathlib import Path
import re
import glob
import random  # Add import for random module

app = Flask(__name__, template_folder='templates', static_folder='static')

# Global variables to store the VQA data
vqa_data = []
images_dirs = {}  # Dictionary mapping image_id -> directory path
output_dir = None

def load_vqa_data_from_json(json_file, base_dir, shuffle=True):
    """Load VQA data from a single consolidated JSON file"""
    global vqa_data, images_dirs
    vqa_data = []
    
    try:
        # Load the JSON file
        with open(json_file, 'r') as f:
            data = json.load(f)
            all_vqa_items = data.get('vqa_items', [])
            
        print(f"Loaded {len(all_vqa_items)} VQA items from {json_file}")
        
        # Process each VQA item
        for item in all_vqa_items:
            # Get episode directory to locate images
            episode_dir = item.get('episode_dir')
            if not episode_dir:
                print(f"Warning: VQA item {item.get('unique_id', 'unknown')} missing episode_dir")
                continue
                
            # Set up image directories
            episode_path = os.path.join(base_dir, episode_dir)
            images_dir = os.path.join(episode_path, "images")
            
            if os.path.isdir(images_dir):
                # Register question image locations
                for img_id in item.get('question', {}).get('image_ids', []):
                    if img_id:
                        images_dirs[img_id] = images_dir
                
                # Register choice image locations
                for choice in item.get('choices', []):
                    img_id = choice.get('image_id')
                    if img_id:
                        images_dirs[img_id] = images_dir
            
            # Add to our global list
            vqa_data.append(item)
        
        # Shuffle all VQA data if requested
        if shuffle:
            random.shuffle(vqa_data)
            print(f"Total VQA items loaded and shuffled: {len(vqa_data)}")
        else:
            print(f"Total VQA items loaded (not shuffled): {len(vqa_data)}")
            
        return vqa_data
        
    except Exception as e:
        print(f"Error loading VQA data from {json_file}: {e}")
        return []

def load_vqa_data_from_csv(csv_file, base_dir, shuffle=True):
    """Load VQA data from a single consolidated CSV file"""
    global vqa_data, images_dirs
    vqa_data = []
    
    try:
        # Read the CSV file
        with open(csv_file, 'r', newline='') as f:
            reader = csv.DictReader(f)
            
            # Process each row
            for row in reader:
                unique_id = row.get('unique_id')
                episode_dir = row.get('episode_dir')
                
                if not episode_dir:
                    print(f"Warning: VQA item {unique_id} missing episode_dir")
                    continue
                
                # Create VQA item structure
                vqa_item = {
                    'unique_id': unique_id,
                    'trajectory_id': row.get('trajectory_id'),
                    'episode_dir': episode_dir,
                    'question': {
                        'text': row.get('question_text', ''),
                        'image_ids': row.get('question_image_ids', '').split(',') if row.get('question_image_ids') else []
                    },
                    'choices': [],
                    'metadata': {
                        'tag': row.get('metadata_tag', '')
                    }
                }
                
                # Add choices
                for i in range(4):
                    choice_text = row.get(f'choice_{i+1}_text')
                    if choice_text:  # Only add non-empty choices
                        is_correct_str = row.get(f'choice_{i+1}_is_correct', 'False')
                        is_correct = is_correct_str.lower() == 'true' if isinstance(is_correct_str, str) else bool(is_correct_str)
                        
                        choice = {
                            'text': choice_text,
                            'is_correct': is_correct,
                            'image_id': row.get(f'choice_{i+1}_image_id', '')
                        }
                        vqa_item['choices'].append(choice)
                
                # Set up image directories
                episode_path = os.path.join(base_dir, episode_dir)
                images_dir = os.path.join(episode_path, "images")
                
                if os.path.isdir(images_dir):
                    # Register question image locations
                    for img_id in vqa_item['question']['image_ids']:
                        if img_id:
                            images_dirs[img_id] = images_dir
                    
                    # Register choice image locations
                    for choice in vqa_item['choices']:
                        img_id = choice.get('image_id')
                        if img_id:
                            images_dirs[img_id] = images_dir
                
                # Add to our global list
                vqa_data.append(vqa_item)
        
        print(f"Loaded {len(vqa_data)} VQA items from {csv_file}")
        
        # Shuffle if requested
        if shuffle:
            random.shuffle(vqa_data)
            print(f"Total VQA items loaded and shuffled: {len(vqa_data)}")
        else:
            print(f"Total VQA items loaded (not shuffled): {len(vqa_data)}")
            
        return vqa_data
        
    except Exception as e:
        print(f"Error loading VQA data from {csv_file}: {e}")
        return []

def load_vqa_data(data_file, base_dir, shuffle=True):
    """Load VQA data from either JSON or CSV file based on extension"""
    if data_file.endswith('.json'):
        return load_vqa_data_from_json(data_file, base_dir, shuffle)
    elif data_file.endswith('.csv'):
        return load_vqa_data_from_csv(data_file, base_dir, shuffle)
    else:
        print(f"Unsupported file format: {data_file}")
        return []

def categorize_questions():
    """Categorize questions by their tag from metadata"""
    categories = {}
    
    for vqa in vqa_data:
        # Get tag from metadata
        tag = vqa.get("metadata", {}).get("tag", "other")
        
        # Create category list if it doesn't exist
        if tag not in categories:
            categories[tag] = []
            
        # Add this question to the appropriate category
        categories[tag].append(vqa)
    
    return categories

@app.route('/')
def index():
    """Main page - show VQA items"""
    return render_template('index.html')

@app.route('/api/vqa_data')
def get_vqa_data():
    """Return VQA data as JSON, with optional filters"""
    # Get filter parameters
    page = request.args.get('page', 0, type=int)
    limit = request.args.get('limit', 10, type=int)
    category = request.args.get('category', None)
    episode = request.args.get('episode', None)
    
    # Apply filtering
    filtered_data = vqa_data
    
    # Filter by episode if specified
    if episode:
        filtered_data = [item for item in filtered_data if item.get('episode_dir') == episode]
    
    # Filter by category if specified
    if category:
        filtered_data = [item for item in filtered_data if item.get('metadata', {}).get('tag') == category]
    
    # Apply pagination
    total = len(filtered_data)
    start = min(page * limit, total)
    end = min(start + limit, total)
    
    paginated_data = filtered_data[start:end]
    
    return jsonify({
        'total': total,
        'page': page,
        'limit': limit,
        'data': paginated_data
    })

@app.route('/api/episodes')
def get_episodes():
    """Return list of available episodes"""
    episodes = set(item.get('episode_dir', '') for item in vqa_data)
    episodes = [ep for ep in episodes if ep]  # Remove empty
    return jsonify({
        'episodes': sorted(episodes)
    })

@app.route('/api/vqa/<int:idx>')
def get_vqa_item(idx):
    """Return a specific VQA item by index"""
    if 0 <= idx < len(vqa_data):
        return jsonify(vqa_data[idx])
    abort(404)

@app.route('/api/vqa/id/<unique_id>')
def get_vqa_item_by_id(unique_id):
    """Return a specific VQA item by its unique ID"""
    for item in vqa_data:
        if item.get('unique_id') == unique_id:
            return jsonify(item)
    abort(404, f"VQA item with ID {unique_id} not found")

@app.route('/api/images/<image_id>')
def get_image(image_id):
    """Serve an image by its ID"""
    # Make sure the image ID is safe
    if not re.match(r'^[a-zA-Z0-9\-_]+$', image_id):
        abort(400, "Invalid image ID format")
    
    # Find the image directory for this ID
    if image_id not in images_dirs:
        abort(404, f"Image ID {image_id} not found")
    
    images_dir = images_dirs[image_id]
    
    # Try both with and without extension
    if os.path.exists(os.path.join(images_dir, f"{image_id}.png")):
        return send_from_directory(images_dir, f"{image_id}.png")
    elif os.path.exists(os.path.join(images_dir, image_id)):
        return send_from_directory(images_dir, image_id)
    else:
        abort(404)

@app.route('/api/statistics')
def get_statistics():
    """Get statistics about the VQA dataset"""
    categories = categorize_questions()
    
    # Count items with images
    items_with_question_images = sum(1 for item in vqa_data if item["question"].get("image_ids") and len(item["question"]["image_ids"]) > 0)
    items_with_choice_images = sum(1 for item in vqa_data 
                                if any(choice.get("image_id") for choice in item["choices"]))
    
    # Count correct answer positions
    correct_positions = [0, 0, 0, 0]  # A, B, C, D
    for item in vqa_data:
        for i, choice in enumerate(item["choices"]):
            if choice.get("is_correct"):
                correct_positions[i] += 1
                break
    
    # Count items per episode
    episodes = {}
    for item in vqa_data:
        episode = item.get('episode_dir', 'unknown')
        episodes[episode] = episodes.get(episode, 0) + 1
    
    # Count items per trajectory
    trajectories = {}
    for item in vqa_data:
        traj_id = item.get('trajectory_id', 'unknown')
        trajectories[traj_id] = trajectories.get(traj_id, 0) + 1
    
    return jsonify({
        'total_items': len(vqa_data),
        'categories': {k: len(v) for k, v in categories.items()},
        'items_with_question_images': items_with_question_images,
        'items_with_choice_images': items_with_choice_images,
        'correct_answer_distribution': {
            'A': correct_positions[0],
            'B': correct_positions[1],
            'C': correct_positions[2],
            'D': correct_positions[3]
        },
        'episodes': episodes,
        'trajectories': trajectories
    })

@app.route('/api/categories')
def get_categories():
    """Return list of available question categories"""
    categories = categorize_questions()
    category_counts = {category: len(items) for category, items in categories.items()}
    return jsonify({
        'categories': list(categories.keys()),
        'counts': category_counts
    })

def main():
    parser = argparse.ArgumentParser(description="Start a web server to display VQA data")
    parser.add_argument("--data-file", type=str, default="vqa_data.json",
                        help="Path to consolidated VQA data file (CSV or JSON)")
    parser.add_argument("--data-dir", type=Path, default="extracted_data", 
                        help="Base directory containing episode subdirectories (for image references)")
    parser.add_argument("--port", type=int, default=5005, help="Port to run the server on")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    parser.add_argument("--no-shuffle", action="store_true", help="Do not shuffle VQA questions")
    
    args = parser.parse_args()
    
    global output_dir
    output_dir = args.data_dir
    
    # Create directories for templates and static files if they don't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    # Load VQA data from the provided file
    if not os.path.exists(args.data_file):
        print(f"Error: Data file not found at {args.data_file}")
        return
    
    load_vqa_data(args.data_file, args.data_dir, not args.no_shuffle)
    
    # Start the Flask server
    print(f"Starting server at http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port)

if __name__ == "__main__":
    main() 