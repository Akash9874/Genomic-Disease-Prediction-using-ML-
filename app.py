from flask import Flask, request, render_template, redirect, url_for, flash, send_from_directory
from sklearn.preprocessing import LabelEncoder
from keras.models import load_model  # type: ignore
from werkzeug.utils import secure_filename
import os
import numpy as np

# Initialize Flask app
app = Flask(__name__)

# Secret key for flash messages
app.secret_key = 'supersecretkey'

# Paths to model and resources
MODEL_PATH = 'models/trained_model.keras'
CLASSES_PATH = 'models/classes.npy'
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'csv', 'txt'}

# Configure upload folder
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load the trained model
model = load_model(MODEL_PATH)

# Load the label encoder classes
label_encoder = LabelEncoder()
label_encoder.classes_ = np.load(CLASSES_PATH, allow_pickle=True)

# Helper function to check allowed files
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Explicitly serve static files."""
    return send_from_directory(app.static_folder, filename)

@app.route('/static/sample_genomic_data.csv')
def legacy_sample_file_redirect():
    # Backward-compatible redirect for older hardcoded sample path
    return redirect(url_for('static', filename='uploads/sample_genomic_data_fixed.csv'))

@app.route('/')
def index():
    # Landing page with video hero and CTA
    return render_template('index.html')

@app.route('/predictor', methods=['GET'])
def predictor():
    # Page with upload form and guidance
    return render_template('predictor.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'file' not in request.files:
            flash('No file part in the request. Please upload a valid file.')
            return redirect(url_for('predictor'))

        file = request.files['file']

        if file.filename == '':
            flash('No file selected. Please choose a file to upload.')
            return redirect(url_for('predictor'))

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            # Process the uploaded file
            input_data = np.genfromtxt(file_path, delimiter=',', skip_header=1)
            print(f"Input data shape: {input_data.shape}")  # Debugging log
            
            # Ensure the data matches the model's expected input shape
            if len(input_data.shape) == 1:
                input_data = input_data.reshape(1, -1)  # Single-row input for prediction
            elif len(input_data.shape) == 2:
                if input_data.shape[1] != 37:
                    flash(f"Invalid input shape. Expected 37 features per row, but got {input_data.shape[1]}.")
                    return redirect(url_for('predictor'))
            else:
                flash('Invalid file format. Please ensure the file matches the model input requirements.')
                return redirect(url_for('predictor'))

            # Make prediction
            prediction = model.predict(input_data)
            predicted_class_index = np.argmax(prediction, axis=1)
            predicted_class = label_encoder.inverse_transform(predicted_class_index)

            confidence = float(np.max(prediction)) if prediction is not None else 0.0
            return render_template('results.html', prediction=predicted_class[0], confidence=confidence)

        else:
            flash('Invalid file type. Allowed file types are CSV and TXT.')
            return redirect(url_for('predictor'))

    except ValueError as e:
        flash(f"ValueError: {e}. Please ensure the file format and data are correct.")
        print(f"ValueError: {e}")
        return redirect(url_for('predictor'))
    except Exception as e:
        flash(f"An unexpected error occurred: {e}")
        print(f"Unexpected error: {e}")
        return redirect(url_for('predictor'))

@app.route('/download-sample')
def download_sample():
    return send_from_directory('static/uploads', 'sample_genomic_data_fixed.csv', as_attachment=True)

if __name__ == '__main__':
    # Ensure the upload folder exists
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    app.run(debug=True)
