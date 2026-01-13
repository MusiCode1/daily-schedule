# /// script
# requires-python = ">=3.8,<3.10"
# dependencies = [
#     "rembg",
#     "pillow",
#     "onnxruntime",
# ]
# ///

import os
from rembg import remove
from PIL import Image

# Define paths
# Script location: .../sveltekit-version/scripts/remove_bg.py
current_dir = os.path.dirname(os.path.abspath(__file__))
# SvelteKit root: .../sveltekit-version (parent of scripts)
sveltekit_root = os.path.dirname(current_dir)

RAW_DIR = os.path.join(sveltekit_root, 'static', 'images', 'raw')
CLEAN_DIR = os.path.join(sveltekit_root, 'static', 'images', 'clean')

def process_images():
    # Ensure clean directory exists
    os.makedirs(CLEAN_DIR, exist_ok=True)

    # Check raw directory
    print(f"Looking for images in: {RAW_DIR}")
    if not os.path.exists(RAW_DIR):
        print(f"Error: Raw directory not found at {RAW_DIR}")
        return

    # Get list of files
    files = [f for f in os.listdir(RAW_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    total = len(files)
    
    if total == 0:
        print("No images found to process.")
        return

    print(f"Found {total} images to process.")
    print("-" * 30)

    # Process loop
    for i, filename in enumerate(files, 1):
        input_path = os.path.join(RAW_DIR, filename)
        output_path = os.path.join(CLEAN_DIR, filename)
        
        if os.path.exists(output_path):
            print(f"[{i}/{total}] Skipping {filename} (already exists)")
            continue

        print(f"[{i}/{total}] Processing {filename}...", end=" ", flush=True)
        
        try:
            with open(input_path, 'rb') as i_file:
                with open(output_path, 'wb') as o_file:
                    input_image = i_file.read()
                    output_image = remove(input_image)
                    o_file.write(output_image)
            print("Done.")
        except Exception as e:
            print(f"Failed!\nError: {e}")

    print("-" * 30)
    print(f"Processing complete. Clean images are in: {CLEAN_DIR}")

if __name__ == "__main__":
    process_images()
