document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const statusMessage = document.getElementById('status-message');
    const metadataDisplay = document.getElementById('metadata-display');
    const ctx = canvas.getContext('2d');

    let imageCapture = false;

    // Access the webcam
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        } catch (err) {
            console.error('Error accessing camera:', err);
            statusMessage.textContent = 'Error accessing camera. Please allow camera access.';
            statusMessage.className = 'error';
        }
    }

    // Capture image from video
    captureBtn.addEventListener('click', () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageCapture = true;
        uploadBtn.disabled = false;
    });

    // Handle file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const img = new Image();

            img.onload = () => {
                // Clear canvas and draw the uploaded image
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Calculate dimensions to maintain aspect ratio
                const ratio = Math.min(
                    canvas.width / img.width,
                    canvas.height / img.height
                );
                const centerX = (canvas.width - img.width * ratio) / 2;
                const centerY = (canvas.height - img.height * ratio) / 2;

                ctx.drawImage(
                    img,
                    0, 0, img.width, img.height,
                    centerX, centerY, img.width * ratio, img.height * ratio
                );

                imageCapture = true;
                uploadBtn.disabled = false;
            };

            img.src = URL.createObjectURL(file);
        }
    });

    // Upload image
    uploadBtn.addEventListener('click', async () => {
        if (!imageCapture) return;

        try {
            // Get the image from canvas
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));

            // Create FormData and append the image
            const formData = new FormData();

            // If file was uploaded, use the original file for metadata extraction
            if (fileInput.files && fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            } else {
                formData.append('image', blob, 'captured-image.jpg');
            }

            // Send to server
            statusMessage.textContent = 'Uploading and extracting metadata...';
            statusMessage.className = '';

            const response = await fetch('https://imagemetadata.vercel.app/api/upload', {
                method: 'POST',
                body: formData
            });

            // Get response as text first
            const responseText = await response.text();
            let data = {};

            try {
                // Try to parse JSON
                if (responseText) {
                    data = JSON.parse(responseText);
                }
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
            }

            if (response.ok) {
                statusMessage.textContent = 'Image uploaded successfully!';
                statusMessage.className = 'success';

                // Display metadata
                displayMetadata(data.image);
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            statusMessage.textContent = `Upload failed: ${err.message}`;
            statusMessage.className = 'error';
        }
    });

    // Function to display metadata
    function displayMetadata(imageData) {
        if (!imageData || !metadataDisplay) return;

        let metadataHTML = `
            <h3>Image Metadata</h3>
            <div class="image-preview-container">
                <img src="${imageData.url}" alt="Uploaded image" style="max-width: 300px; max-height: 200px;">
            </div>
            <table class="metadata-table">
                <tr>
                    <th>Property</th>
                    <th>Value</th>
                </tr>
        `;

        // Add basic metadata
        metadataHTML += `
            <tr><td>Format</td><td>${imageData.metadata.format || 'Unknown'}</td></tr>
            <tr><td>Dimensions</td><td>${imageData.metadata.width || 0} x ${imageData.metadata.height || 0}</td></tr>
            <tr><td>Size</td><td>${formatFileSize(imageData.metadata.size || 0)}</td></tr>
            <tr><td>Created</td><td>${formatDate(imageData.metadata.created_at)}</td></tr>
        `;

        // Add EXIF data if available
        if (imageData.metadata.exif) {
            for (const [key, value] of Object.entries(imageData.metadata.exif)) {
                if (value !== null && value !== undefined) {
                    metadataHTML += `<tr><td>${formatExifKey(key)}</td><td>${formatExifValue(key, value)}</td></tr>`;
                }
            }
        }

        // Add GPS data if available
        if (imageData.metadata.location) {
            metadataHTML += `
                <tr>
                    <td>Location</td>
                    <td>
                        ${imageData.metadata.location.latitude}, ${imageData.metadata.location.longitude}
                        <br>
                        <a href="https://maps.google.com/?q=${imageData.metadata.location.latitude},${imageData.metadata.location.longitude}" target="_blank">View on Google Maps</a>
                    </td>
                </tr>
            `;
        }

        metadataHTML += `</table>`;
        metadataDisplay.innerHTML = metadataHTML;
    }

    // Helper functions for formatting metadata
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleString();
    }

    function formatExifKey(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    function formatExifValue(key, value) {
        if (key.toLowerCase().includes('date')) {
            try {
                return new Date(value).toLocaleString();
            } catch (e) {
                return value;
            }
        }
        return value;
    }

    // Start the camera when page loads
    startCamera();
});
