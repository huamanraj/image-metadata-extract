document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('capture-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const cameraInput = document.getElementById('camera-input'); // Add this line
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

    // Function to handle image files (used by both file inputs)
    function handleImageFile(file) {
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

    // Handle regular file input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
        }
    });

    // Handle camera input change
    cameraInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
        }
    });

    // Upload image
    uploadBtn.addEventListener('click', async () => {
        if (!imageCapture) return;

        try {
            // Create FormData and append the image
            const formData = new FormData();

            // If file was uploaded from device or camera, use the original file for metadata extraction
            if (fileInput.files && fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            } else if (cameraInput.files && cameraInput.files[0]) {
                formData.append('image', cameraInput.files[0]);
            } else {
                // Get the image from canvas if it was captured from webcam
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
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
                console.log('Raw response:', responseText);
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

    // Rest of your code remains the same...

    // Start the camera when page loads
    startCamera();
});
