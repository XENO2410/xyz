# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from werkzeug.utils import secure_filename
import pytesseract
import pdf2image
import tempfile
from pathlib import Path
from document_validators import DOCUMENT_VALIDATORS
import cv2
import numpy as np
import re
from typing import Dict, Any

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure upload folder and allowed extensions
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads folder if it doesn't exist
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Windows

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_pdf(file) -> str:
    """Process PDF file and extract text"""
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f"temp_{filename}")
        file.save(temp_path)

        try:
            # Convert PDF to images
            images = pdf2image.convert_from_path(temp_path)
            extracted_text = ""
            
            for img in images:
                # Convert PIL Image to OpenCV format
                opencv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
                
                # Image preprocessing pipeline
                # 1. Resize if too small
                height, width = opencv_img.shape[:2]
                if height < 1000:
                    scale = 1000/height
                    opencv_img = cv2.resize(opencv_img, None, fx=scale, fy=scale)
                
                # 2. Convert to grayscale
                gray = cv2.cvtColor(opencv_img, cv2.COLOR_BGR2GRAY)
                
                # 3. Apply adaptive thresholding
                binary = cv2.adaptiveThreshold(
                    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                    cv2.THRESH_BINARY, 11, 2
                )
                
                # 4. Denoise
                denoised = cv2.fastNlMeansDenoising(binary)
                
                # 5. Apply different preprocessing techniques and combine results
                text1 = pytesseract.image_to_string(denoised, lang='eng+hin')
                text2 = pytesseract.image_to_string(gray, lang='eng+hin')
                
                # Combine texts (this helps catch text that might be missed by one method)
                extracted_text += text1 + "\n" + text2 + "\n"
            
            # Clean up extracted text
            extracted_text = re.sub(r'\s+', ' ', extracted_text)  # Remove extra whitespace
            extracted_text = extracted_text.strip()
            
            logger.debug(f"Extracted text: {extracted_text}")
            return extracted_text
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}", exc_info=True)
        raise
    
@app.route('/verify', methods=['POST'])
def verify_document():
    try:
        if 'file' not in request.files:
            logger.error("No file provided in request")
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        doc_type = request.form.get('documentType')
        
        logger.info(f"Processing document type: {doc_type}")
        
        if not doc_type:
            logger.error("Document type not specified")
            return jsonify({"error": "Document type not specified"}), 400
        
        if file.filename == '':
            logger.error("No selected file")
            return jsonify({"error": "No selected file"}), 400
        
        if not allowed_file(file.filename):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({"error": "Only PDF files are allowed"}), 400
        
        if doc_type not in DOCUMENT_VALIDATORS:
            logger.error(f"Unsupported document type: {doc_type}")
            return jsonify({
                "error": f"Unsupported document type: {doc_type}",
                "isValid": False,
                "confidence": 0,
                "details": {"errors": ["Unsupported document type"]}
            }), 400
        
        # Process the PDF and extract text
        logger.info(f"Extracting text from file: {file.filename}")
        extracted_text = process_pdf(file)
        
        # Validate using appropriate validator
        logger.info("Validating document...")
        validator = DOCUMENT_VALIDATORS[doc_type]
        result = validator.validate(extracted_text)
        
        logger.info(f"Validation result: {result['isValid']}")
        return jsonify(result)
                
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "isValid": False,
            "confidence": 0,
            "details": {"errors": [str(e)]}
        }), 500
        
if __name__ == '__main__':
    app.run(debug=True)