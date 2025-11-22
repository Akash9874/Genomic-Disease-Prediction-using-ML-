from flask import Flask, request, render_template, redirect, url_for, flash, send_from_directory
from sklearn.preprocessing import LabelEncoder
from keras.models import load_model  # type: ignore
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeSerializer  # type: ignore
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
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB upload limit

# Configure upload folder
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load the trained model
model = load_model(MODEL_PATH)

# Load the label encoder classes
label_encoder = LabelEncoder()
label_encoder.classes_ = np.load(CLASSES_PATH, allow_pickle=True)

# Serializer for shareable links
serializer = URLSafeSerializer(app.secret_key, salt="share-result")

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

        # Collect uploaded files robustly (single or multiple)
        try:
            files = request.files.getlist('file')
        except Exception:
            single = request.files.get('file')
            files = [single] if single else []

        # Filter out empty placeholders
        files = [f for f in files if getattr(f, 'filename', '')]
        if not files:
            flash('No files selected. Please choose at least one file to upload.')
            return redirect(url_for('predictor'))

        results = []

        for file in files:
            if not allowed_file(file.filename):
                flash(f'Invalid file type for {file.filename}. Allowed: CSV, TXT.')
                continue

            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            # Process the uploaded file
            input_data = np.genfromtxt(file_path, delimiter=',', skip_header=1)
            # Basic schema checks: numeric and finite
            if not np.isfinite(input_data).all():
                flash(f"Detected non-numeric or infinite values in {filename}. Please clean the data.")
                continue
            print(f"Input data shape: {input_data.shape}")  # Debugging log
            
            # Ensure the data matches the model's expected input shape
            if len(input_data.shape) == 1:
                input_data = input_data.reshape(1, -1)  # Single-row input for prediction
            elif len(input_data.shape) == 2:
                if input_data.shape[1] != 37:
                    flash(f"Invalid input shape. Expected 37 features per row, but got {input_data.shape[1]}.")
                    continue
            else:
                flash('Invalid file format. Please ensure the file matches the model input requirements.')
                continue

            # Make prediction
            prediction = model.predict(input_data)  # shape (N, C)
            probs = prediction
            top_indices = np.argsort(probs, axis=1)[:, ::-1]
            top1_idx = top_indices[:, 0]
            top1_conf = probs[np.arange(probs.shape[0]), top1_idx]
            top1_labels = label_encoder.inverse_transform(top1_idx)

            # Collect top-3 per row
            results_for_file = []
            for row_i in range(probs.shape[0]):
                row_top = top_indices[row_i, :3]
                top3 = [(label_encoder.inverse_transform([i])[0], float(probs[row_i, i])) for i in row_top]
                token = serializer.dumps({
                    'prediction': top1_labels[row_i],
                    'confidence': float(top1_conf[row_i]),
                    'top3': top3
                })
                results_for_file.append({
                    'row_index': int(row_i + 1),
                    'top3': top3,
                    'prediction': top1_labels[row_i],
                    'confidence': float(top1_conf[row_i]),
                    'share_url': url_for('shared_result', token=token, _external=False)
                })

            results.append({
                'filename': filename,
                'items': results_for_file
            })

        if not results:
            return redirect(url_for('predictor'))

        # Single result with single row → show simple page
        if len(results) == 1 and len(results[0]['items']) == 1:
            r = results[0]['items'][0]
            data = {'prediction': r['prediction'], 'confidence': r['confidence'], 'top3': r['top3']}
            token = serializer.dumps(data)
            share_url = url_for('shared_result', token=token, _external=False)
            return render_template('results.html',
                                   prediction=r['prediction'],
                                   confidence=r['confidence'],
                                   top3=r['top3'],
                                   share_url=share_url)

        # Otherwise, show batch results
        return render_template('results_batch.html', results=results)

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

@app.route('/results/share/<token>')
def shared_result(token):
    try:
        data = serializer.loads(token)
        prediction = data.get('prediction')
        confidence = float(data.get('confidence', 0.0))
        top3 = data.get('top3', [])
        return render_template('results.html',
                               prediction=prediction,
                               confidence=confidence,
                               top3=top3,
                               share_url=None)
    except Exception:
        flash('Invalid or expired share link.')
        return redirect(url_for('index'))

if __name__ == '__main__':
    # Ensure the upload folder exists
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    app.run(debug=True)
