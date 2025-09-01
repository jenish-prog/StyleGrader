import os
import cv2
import numpy as np
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['RESULT_FOLDER'] = 'static/results'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload and result directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def color_transfer(source, reference, alpha=0.8):
    """
    Transfer color distribution from reference to source image with brightness preservation
    
    Args:
        source: Source image (BGR)
        reference: Reference image (BGR)
        alpha: Controls the amount of color transfer (0.0 to 1.0)
    """
    # Convert to LAB color space
    source_lab = cv2.cvtColor(source, cv2.COLOR_BGR2LAB).astype("float32")
    reference_lab = cv2.cvtColor(reference, cv2.COLOR_BGR2LAB).astype("float32")
    
    # Split into channels
    l_src, a_src, b_src = cv2.split(source_lab)
    l_ref, a_ref, b_ref = cv2.split(reference_lab)
    
    # Compute mean and standard deviation for each channel
    l_mean_src, l_std_src = l_src.mean(), l_src.std()
    a_mean_src, a_std_src = a_src.mean(), a_src.std()
    b_mean_src, b_std_src = b_src.mean(), b_src.std()
    
    l_mean_ref, l_std_ref = l_ref.mean(), l_ref.std()
    a_mean_ref, a_std_ref = a_ref.mean(), a_ref.std()
    b_mean_ref, b_std_ref = b_ref.mean(), b_ref.std()
    
    # Handle division by zero
    l_std_src = max(l_std_src, 1e-6)
    a_std_src = max(a_std_src, 1e-6)
    b_std_src = max(b_std_src, 1e-6)
    
    # Preserve original brightness (luminance)
    l = l_src.copy()
    
    # Apply color transfer to a and b channels with alpha blending
    a = ((a_src - a_mean_src) * (a_std_ref / a_std_src) + a_mean_ref) * alpha + a_src * (1 - alpha)
    b = ((b_src - b_mean_src) * (b_std_ref / b_std_src) + b_mean_ref) * alpha + b_src * (1 - alpha)
    
    # Merge channels and clip values
    transfer = cv2.merge([l, a, b])
    transfer = np.clip(transfer, 0, 255).astype("uint8")
    
    # Convert back to BGR
    result = cv2.cvtColor(transfer, cv2.COLOR_LAB2BGR)
    
    # Apply subtle contrast enhancement
    lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl,a,b))
    final = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    
    # Blend with original to preserve some of the source's character
    final = cv2.addWeighted(final, 0.8, source, 0.2, 0)
    
    return final

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    print("Processing request...")  # Debug log
    print("Files in request:", request.files)  # Debug log
    
    if 'source' not in request.files or 'reference' not in request.files:
        print("Missing files in request")  # Debug log
        return jsonify({'error': 'Missing source or reference image'}), 400
    
    source_file = request.files['source']
    reference_file = request.files['reference']
    
    print(f"Source file: {source_file.filename}")  # Debug log
    print(f"Reference file: {reference_file.filename}")  # Debug log
    
    if source_file.filename == '' or reference_file.filename == '':
        print("Empty filename")  # Debug log
        return jsonify({'error': 'No selected file'}), 400
    
    if not (source_file and allowed_file(source_file.filename) and 
            reference_file and allowed_file(reference_file.filename)):
        print("Invalid file type")  # Debug log
        return jsonify({'error': 'Invalid file type. Allowed types are: png, jpg, jpeg'}), 400
    
    try:
        # Save uploaded files
        source_filename = secure_filename(source_file.filename)
        reference_filename = secure_filename(reference_file.filename)
        source_path = os.path.join(app.config['UPLOAD_FOLDER'], source_filename)
        reference_path = os.path.join(app.config['UPLOAD_FOLDER'], reference_filename)
        
        print(f"Saving source to: {source_path}")  # Debug log
        print(f"Saving reference to: {reference_path}")  # Debug log
        
        source_file.save(source_path)
        reference_file.save(reference_path)
        
        # Verify files were saved
        if not os.path.exists(source_path) or not os.path.exists(reference_path):
            print("Failed to save files")  # Debug log
            return jsonify({'error': 'Failed to save uploaded files'}), 500
        
        # Process images
        print("Reading images...")  # Debug log
        source_img = cv2.imread(source_path)
        ref_img = cv2.imread(reference_path)
        
        if source_img is None or ref_img is None:
            print(f"Failed to read images. Source: {source_img is None}, Ref: {ref_img is None}")  # Debug log
            return jsonify({'error': 'Invalid image file or unsupported format'}), 400
            
        # Store original dimensions of source image
        original_height, original_width = source_img.shape[:2]
        
        # Resize reference image to match source image dimensions
        ref_img = cv2.resize(ref_img, (original_width, original_height))
        
        result = color_transfer(source_img, ref_img)
        
        # Save result
        result_filename = f'result_{os.urandom(8).hex()}.jpg'
        result_path = os.path.join(app.config['RESULT_FOLDER'], result_filename)
        cv2.imwrite(result_path, result)
        
        # Return the result URL
        result_url = f"static/results/{result_filename}"
        return jsonify({'result_url': result_url})
    
    except Exception as e:
        print(f"Error processing images: {str(e)}")  # Debug log
        return jsonify({'error': 'Error processing images'}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5050)
