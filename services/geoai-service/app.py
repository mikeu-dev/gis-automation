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
    Analyzes the image using Google Gemini 1.5 Flash.
    """
    try:
        import google.generativeai as genai
        from dotenv import load_dotenv
        from PIL import Image
        
        # Load environment variables from app .env
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'app', '.env')
        load_dotenv(env_path)
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {
                "message": "Error",
                "analysis": "API Key Gemini tidak ditemukan. Harap set GEMINI_API_KEY di .env.",
                "features_detected": 0
            }

        genai.configure(api_key=api_key)

        # 1. Decode base64 image to temporary file
        input_filename = "temp_input.png"
        
        # Remove header if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
            
        with open(input_filename, "wb") as f:
            f.write(base64.b64decode(image_base64))
            
        # Optimize size
        try:
            with Image.open(input_filename) as img:
                max_size = 1024
                ratio = min(max_size / img.width, max_size / img.height)
                if ratio < 1:
                    new_size = (int(img.width * ratio), int(img.height * ratio))
                    print(f"Resizing input image for Gemini from {img.size} to {new_size}")
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
                    img.save(input_filename)
        except Exception as e:
            print(f"Resize warning: {e}")

        # 2. Upload to Gemini
        print("Uploading to Gemini...")
        myfile = genai.upload_file(input_filename)
        
        # 3. Initialize Model
        model = genai.GenerativeModel("gemini-1.5-flash")

        # 4. Generate Content
        default_prompt = "Analyze this satellite map image. Identify visible features like buildings, roads, vegetation, and water bodies. Provide a concise summary of what is seen in the image, estimating the density of buildings and types of roads."
        text_prompt = prompt if prompt else default_prompt
        
        print(f"Generating content with Gemini Flash... Prompt: {text_prompt}")
        result = model.generate_content([myfile, text_prompt])
        
        response_text = result.text
        
        return {
            "message": "Success",
            "analysis": response_text,
            "features_detected": -1,
            "data": "{}"
        }

    except Exception as e:
        print(f"Error in Gemini processing: {e}")
        return {
            "message": "Error",
            "analysis": f"Gemini Analysis failed: {str(e)}",
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
