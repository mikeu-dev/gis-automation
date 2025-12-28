import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "online",
        "service": "GeoAI Service",
        "endpoints": ["/analyze"]
    })

def analyze_image_with_geoai(image_base64, prompt=None):
    """
    Analyzes the image using GeoAI (GroundedSAM) to detect features based on prompt.
    """
    try:
        import geopandas as gpd
        from geoai.segment import GroundedSAM

        # 1. Decode base64 image to temporary file
        input_filename = "temp_input.png"
        output_filename = "temp_output.geojson"
        
        # Remove header if present (although utils/geoai.ts did it, good to be safe)
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
            
        from PIL import Image
        
        # Save raw bytes first
        with open(input_filename, "wb") as f:
            f.write(base64.b64decode(image_base64))
            
        # Optimize size: Resize to max 1024px
        try:
            with Image.open(input_filename) as img:
                # Calculate new size maintaining aspect ratio
                max_size = 1024
                ratio = min(max_size / img.width, max_size / img.height)
                
                if ratio < 1: # Only resize if larger than max_size
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    print(f"Resizing input image from {img.size} to {new_size}")
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                    img.save(input_filename)
        except Exception as e:
            print(f"Warning: Failed to resize image: {e}")

        # 2. Determine prompt
        text_prompt = prompt if prompt else "building"
        print(f"Running GroundedSAM with prompt: {text_prompt}")

        # 3. Initialize Model (this will download weights on first run)
        model = GroundedSAM()

        # 4. Run Segmentation
        # usage: segment(image, text_prompt, output, ...)
        model.segment(
            image=input_filename,
            text_prompt=text_prompt,
            output=output_filename,
            simplify_tolerance=0.5 # Simplify polygons slightly
        )

        # 5. Process Results
        if os.path.exists(output_filename):
            gdf = gpd.read_file(output_filename)
            count = len(gdf)
            geojson_str = gdf.to_json()
            
            # Clean up
            # os.remove(input_filename)
            # os.remove(output_filename) # Keep for debugging if needed
            
            return {
                "message": "Success",
                "analysis": f"GeoAI detected {count} features matching '{text_prompt}'.",
                "features_detected": count,
                "data": geojson_str
            }
        else:
            return {
                "message": "No results",
                "analysis": f"No features found for '{text_prompt}'.",
                "features_detected": 0
            }

    except Exception as e:
        print(f"Error in GeoAI processing: {e}")
        # Return error as analysis so it's visible in frontend
        return {
            "message": "Error",
            "analysis": f"Analysis failed: {str(e)}",
            "features_detected": 0
        }

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        image_data = data['image']
        prompt = data.get('context', '') # Context/Prompt might be less relevant for pure CV, but kept for compatibility

        result = analyze_image_with_geoai(image_data, prompt)

        # The frontend expects a 'text' field mostly, but we can send more structured data
        return jsonify({
            'text': result['analysis'],
            'data': result
        })

    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
