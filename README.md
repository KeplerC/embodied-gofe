# Visual Question Answering Visualization

A static site for visualizing Visual Question Answering (VQA) datasets. This project allows you to browse and interact with VQA data, including questions, images, and multiple-choice answers.

## Demo

The site is hosted on GitHub Pages at: [https://yourusername.github.io/vqa-visualization](https://yourusername.github.io/vqa-visualization)

## Features

- Browse VQA questions with associated images
- Filter questions by category
- View question statistics and distributions
- Interactive gallery of example questions
- Keyboard navigation (arrow keys)

## Converting from Flask to Static Site

This project was originally a Flask server application, but has been converted to a static site for GitHub Pages hosting.

### How to Generate the Static Site

1. Place your VQA data file (JSON or CSV) in the root directory
2. Make sure your image files are in the `extracted_data` directory
3. Run the static site generator:

```bash
python static_site_generator.py --data-file=vqa_data.json --data-dir=extracted_data --output-dir=docs
```

Options:
- `--data-file`: Path to your VQA data file (JSON or CSV)
- `--data-dir`: Base directory containing images
- `--output-dir`: Output directory for the static site (use `docs` for GitHub Pages)
- `--no-shuffle`: Do not shuffle VQA questions

### Setting up GitHub Pages

1. Create a new GitHub repository
2. Push the generated `docs` directory to the repository
3. In your repository settings, enable GitHub Pages and select the `docs` directory as the source

## Data Format

The VQA data should be in JSON or CSV format with the following structure:

```json
[
  {
    "unique_id": "vqa_123",
    "episode_dir": "episode_001",
    "trajectory_id": "traj_123",
    "question": {
      "text": "What is the robot doing?",
      "image_ids": ["img_001", "img_002"]
    },
    "choices": [
      {
        "text": "Picking up an object",
        "is_correct": true,
        "image_id": "img_003"
      },
      {
        "text": "Moving forward",
        "is_correct": false,
        "image_id": "img_004"
      }
    ],
    "metadata": {
      "tag": "action"
    }
  }
]
```

## Development

To modify the static site:

1. Edit HTML (`index.html`), CSS (`static/style.css`), and JavaScript (`static/script.js`) as needed
2. Run the static site generator again to rebuild the site
3. Push the changes to GitHub

## License

[MIT License](LICENSE)
