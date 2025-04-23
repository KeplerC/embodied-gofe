#!/usr/bin/env python3
import os
import json
import argparse
from vqa_server import load_vqa_data, categorize_questions

def main():
    parser = argparse.ArgumentParser(description="Generate static JSON files for GitHub Pages")
    parser.add_argument("--data-file", type=str, default="vqa_data.json",
                        help="Path to consolidated VQA data file (CSV or JSON)")
    parser.add_argument("--data-dir", type=str, default="extracted_data", 
                        help="Base directory containing episode subdirectories")
    parser.add_argument("--output-dir", type=str, default="docs", 
                        help="Output directory for static files (GitHub Pages uses 'docs' or 'root')")
    parser.add_argument("--no-shuffle", action="store_true", help="Do not shuffle VQA questions")
    
    args = parser.parse_args()
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    os.makedirs(os.path.join(args.output_dir, "data"), exist_ok=True)
    os.makedirs(os.path.join(args.output_dir, "static"), exist_ok=True)
    os.makedirs(os.path.join(args.output_dir, "images"), exist_ok=True)
    
    # Load VQA data
    print(f"Loading VQA data from {args.data_file}...")
    vqa_data = load_vqa_data(args.data_file, args.data_dir, not args.no_shuffle)
    
    # Generate vqa_data.json with all items
    print(f"Generating VQA data files...")
    with open(os.path.join(args.output_dir, "data", "vqa_data.json"), "w") as f:
        json.dump(vqa_data, f)
    
    # Generate episodes.json
    episodes = set(item.get('episode_dir', '') for item in vqa_data)
    episodes = [ep for ep in episodes if ep]  # Remove empty
    with open(os.path.join(args.output_dir, "data", "episodes.json"), "w") as f:
        json.dump({"episodes": sorted(episodes)}, f)
    
    # Generate categories.json
    categories = categorize_questions()
    category_counts = {category: len(items) for category, items in categories.items()}
    with open(os.path.join(args.output_dir, "data", "categories.json"), "w") as f:
        json.dump({
            "categories": list(categories.keys()),
            "counts": category_counts
        }, f)
    
    # Generate statistics.json
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
    episodes_count = {}
    for item in vqa_data:
        episode = item.get('episode_dir', 'unknown')
        episodes_count[episode] = episodes_count.get(episode, 0) + 1
    
    # Count items per trajectory
    trajectories = {}
    for item in vqa_data:
        traj_id = item.get('trajectory_id', 'unknown')
        trajectories[traj_id] = trajectories.get(traj_id, 0) + 1
    
    statistics = {
        'total_items': len(vqa_data),
        'categories': category_counts,
        'items_with_question_images': items_with_question_images,
        'items_with_choice_images': items_with_choice_images,
        'correct_answer_distribution': {
            'A': correct_positions[0],
            'B': correct_positions[1],
            'C': correct_positions[2],
            'D': correct_positions[3]
        },
        'episodes': episodes_count,
        'trajectories': trajectories
    }
    
    with open(os.path.join(args.output_dir, "data", "statistics.json"), "w") as f:
        json.dump(statistics, f)
    
    # Copy static files
    print("Copying static files...")
    
    # Copy CSS
    with open("static/style.css", "r") as src_file, open(os.path.join(args.output_dir, "static", "style.css"), "w") as dest_file:
        dest_file.write(src_file.read())
    
    # Copy or modify JavaScript
    with open("static/script.js", "r") as f:
        script_content = f.read()
    
    # Update API URLs to use static JSON files
    script_content = script_content.replace('/api/vqa_data', 'data/vqa_data.json')
    script_content = script_content.replace('/api/episodes', 'data/episodes.json')
    script_content = script_content.replace('/api/categories', 'data/categories.json')
    script_content = script_content.replace('/api/statistics', 'data/statistics.json')
    script_content = script_content.replace('/api/images/', 'images/')
    
    with open(os.path.join(args.output_dir, "static", "script.js"), "w") as f:
        f.write(script_content)
    
    # Create modified index.html with proper static file references
    with open("templates/index.html", "r") as f:
        html_content = f.read()
    
    # Update static file references
    html_content = html_content.replace('{{ url_for(\'static\', filename=\'style.css\') }}', 'static/style.css')
    html_content = html_content.replace('{{ url_for(\'static\', filename=\'script.js\') }}', 'static/script.js')
    
    with open(os.path.join(args.output_dir, "index.html"), "w") as f:
        f.write(html_content)
        
    # Copy image files
    print("Copying image files...")
    import shutil
    for item in vqa_data:
        # Process question images
        if item["question"].get("image_ids"):
            for img_id in item["question"]["image_ids"]:
                if img_id:
                    copy_image(img_id, args.data_dir, os.path.join(args.output_dir, "images"))
        
        # Process choice images
        for choice in item["choices"]:
            img_id = choice.get("image_id")
            if img_id:
                copy_image(img_id, args.data_dir, os.path.join(args.output_dir, "images"))
    
    print(f"Static site generated successfully in {args.output_dir}/")
    print("You can now upload this directory to GitHub Pages.")

def copy_image(image_id, data_dir, output_dir):
    """Copy an image to the output directory"""
    # Try both with and without extension
    source_paths = [
        os.path.join(data_dir, f"{image_id}.png"),
        os.path.join(data_dir, image_id)
    ]
    
    for source_path in source_paths:
        if os.path.exists(source_path):
            import shutil
            dest_path = image_id.strip(".png")
            try:
                shutil.copy2(source_path, dest_path)
                return True
            except Exception as e:
                print(f"Error copying {source_path}: {e}")
                return False
    
    print(f"Warning: Image {image_id} not found")
    return False

if __name__ == "__main__":
    main() 