// Global variables
let currentResult = null;
let originalResult = null;
let canvas = document.createElement('canvas');
let ctx = canvas.getContext('2d');
let isProcessing = false;
let debounceTimer = null;
let lastPreviewUpdate = 0;
let lastValues = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0
};

// File variables
let sourceFile = null;
let referenceFile = null;

// DOM elements
let processBtn;
let resultPreview;
let downloadBtn;
let adjustmentControls;

// Debounce function to limit how often the update happens
function debounce(func, wait) {
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), wait);
    };
}

// Function to update image adjustments
function updateAdjustments() {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
        const resultPreview = document.getElementById('resultPreview');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (!originalResult) {
            isProcessing = false;
            return;
        }

        // Get current slider values
        const brightness = parseInt(document.getElementById('brightness').value) || 0;
        const contrast = parseInt(document.getElementById('contrast').value) || 0;
        const saturation = parseInt(document.getElementById('saturation').value) || 0;
        const temperature = parseInt(document.getElementById('temperature').value) || 0;
        
        // Update display values
        document.getElementById('brightnessValue').textContent = brightness;
        document.getElementById('contrastValue').textContent = contrast;
        document.getElementById('saturationValue').textContent = saturation;
        document.getElementById('temperatureValue').textContent = temperature;
        
        // Create a temporary image for processing
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
            try {
                // Use a smaller version for preview if the image is large
                const maxDimension = 1000;
                let width = img.width;
                let height = img.height;
                
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height / width) * maxDimension);
                        width = maxDimension;
                    } else {
                        width = Math.round((width / height) * maxDimension);
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw original image with new dimensions
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // Apply filters
                let filter = '';
                
                // Brightness (range: -100 to 100)
                if (brightness !== 0) {
                    filter += `brightness(${100 + brightness}%) `;
                }
                
                // Contrast (range: -100 to 100)
                if (contrast !== 0) {
                    const contrastValue = 1 + (contrast / 100);
                    filter += `contrast(${contrastValue}) `;
                }
                
                // Saturation (range: -100 to 100)
                if (saturation !== 0) {
                    const saturationValue = 1 + (saturation / 100);
                    filter += `saturate(${saturationValue}) `;
                }
                
                // Temperature (range: -100 to 100)
                if (temperature !== 0) {
                    filter += `sepia(${Math.abs(temperature) / 2}%) `;
                    filter += `hue-rotate(${temperature / 5}deg) `;
                }
                
                // Apply all filters
                ctx.filter = filter.trim();
                
                // Redraw image with filters
                ctx.drawImage(canvas, 0, 0);
                
                // Reset filter for next operation
                ctx.filter = 'none';
                
                // Update the preview
                const resultImg = resultPreview.querySelector('img');
                if (resultImg) {
                    resultImg.src = canvas.toDataURL('image/jpeg', 0.9);
                    currentResult = resultImg.src;
                    downloadBtn.href = currentResult;
                    downloadBtn.download = `styled_${Date.now()}.jpg`;
                }
                
            } catch (error) {
                console.error('Error applying filters:', error);
            } finally {
                isProcessing = false;
            }
        };
        
        img.onerror = () => {
            console.error('Error loading image for adjustments');
            isProcessing = false;
        };
        
        // Start loading the image
        img.src = originalResult;
        
    } catch (error) {
        console.error('Error in updateAdjustments:', error);
        isProcessing = false;
    }
}

// Create debounced version of updateAdjustments
const debouncedUpdateAdjustments = debounce(updateAdjustments, 50);

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const sourceFileInput = document.getElementById('sourceFile');
    const referenceFileInput = document.getElementById('referenceFile');
    const processBtn = document.getElementById('processBtn');
    const sourcePreview = document.getElementById('sourcePreview');
    const referencePreview = document.getElementById('referencePreview');
    const resultPreview = document.getElementById('resultPreview');
    const downloadBtn = document.getElementById('downloadBtn');
    const adjustmentControls = document.getElementById('adjustmentControls');
    const resetBtn = document.getElementById('resetAdjustments');

    let sourceFile = null;
    let referenceFile = null;

    // Handle source file selection
    sourceFileInput.addEventListener('change', (e) => {
        console.log('Source file input changed');
        console.log('Files:', e.target.files);
        const file = e.target.files[0];
        if (file) {
            console.log('Source file selected:', file.name, file.type, file.size);
            sourceFile = file;
            displayImagePreview(file, sourcePreview);
            checkProcessButton();
        } else {
            console.log('No file selected for source');
        }
    });

    // Handle reference file selection
    referenceFileInput.addEventListener('change', (e) => {
        console.log('Reference file input changed');
        console.log('Files:', e.target.files);
        const file = e.target.files[0];
        if (file) {
            console.log('Reference file selected:', file.name, file.type, file.size);
            referenceFile = file;
            displayImagePreview(file, referencePreview);
            checkProcessButton();
        } else {
            console.log('No file selected for reference');
        }
    });

    // Process button click handler
    processBtn.addEventListener('click', processImages);
    
    // Reset adjustments
    resetBtn.addEventListener('click', resetAdjustments);
    
    // Add event listeners for sliders with debouncing
    const sliders = ['brightness', 'contrast', 'saturation', 'temperature'];
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.addEventListener('input', debouncedUpdateAdjustments);
        }
    });

    // Function to display image preview
    function displayImagePreview(file, container) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = function() {
                // Create a canvas to resize the image for preview
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxWidth = 300;
                const maxHeight = 300;
                
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Set the preview image
                container.innerHTML = `<img src="${canvas.toDataURL('image/jpeg', 0.9)}" alt="Preview" style="max-width: 100%; height: auto;">`;
            };
            img.onerror = () => {
                console.error('Error loading preview image');
                container.innerHTML = '<p>Error loading image</p>';
            };
            img.src = e.target.result;
        };
        reader.onerror = () => {
            console.error('Error reading file');
            container.innerHTML = '<p>Error loading file</p>';
        };
        reader.readAsDataURL(file);
    }

    // Enable/disable process button based on file selection
    function checkProcessButton() {
        processBtn.disabled = !(sourceFile && referenceFile);
    }

    // Process the images
    async function processImages() {
        if (!sourceFile || !referenceFile) return;

        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';
        resultPreview.innerHTML = '<p>Processing images...</p>';

        try {
            const sourceImg = await loadImage(sourceFile);
            const referenceImg = await loadImage(referenceFile);
            
            // Create canvas for processing
            canvas.width = sourceImg.width;
            canvas.height = sourceImg.height;
            
            // Draw source image
            ctx.drawImage(sourceImg, 0, 0);
            
            // Apply color transfer (simplified - just apply reference image's color style)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const refImageData = await getImageData(referenceImg);
            
            // Apply color transfer using mean and standard deviation
            const targetStats = calculateStats(refImageData);
            applyColorTransfer(imageData, targetStats);
            
            // Apply the processed image data back to canvas
            ctx.putImageData(imageData, 0, 0);
            
            // Create result URL
            const resultUrl = canvas.toDataURL('image/jpeg', 0.9);
            currentResult = resultUrl;
            originalResult = resultUrl;
            
            // Show the result
            resultPreview.innerHTML = `
                <img src="${resultUrl}" 
                     alt="Result" 
                     style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
            `;
            
            downloadBtn.href = resultUrl;
            downloadBtn.download = `result_${Date.now()}.jpg`;
            downloadBtn.style.display = 'inline-block';
            adjustmentControls.style.display = 'block';
            
            // Reset sliders
            document.getElementById('brightness').value = 0;
            document.getElementById('contrast').value = 0;
            document.getElementById('saturation').value = 0;
            document.getElementById('temperature').value = 0;
            
            // Reset display values
            document.getElementById('brightnessValue').textContent = '0';
            document.getElementById('contrastValue').textContent = '0';
            document.getElementById('saturationValue').textContent = '0';
            document.getElementById('temperatureValue').textContent = '0';
            
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while processing the images. Please try again.');
        } finally {
            processBtn.disabled = false;
            processBtn.textContent = 'Process Images';
        }
    }
    
    // Helper function to load an image
    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
    
    // Helper function to get image data
    function getImageData(img) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        return tempCtx.getImageData(0, 0, img.width, img.height);
    }
    
    // Helper function to calculate mean and standard deviation for each channel
    function calculateStats(imageData) {
        const data = imageData.data;
        let rSum = 0, gSum = 0, bSum = 0;
        let rSqSum = 0, gSqSum = 0, bSqSum = 0;
        const count = data.length / 4;
        
        // First pass: calculate means and squared sums
        for (let i = 0; i < data.length; i += 4) {
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
            
            rSqSum += data[i] * data[i];
            gSqSum += data[i + 1] * data[i + 1];
            bSqSum += data[i + 2] * data[i + 2];
        }
        
        const rMean = rSum / count;
        const gMean = gSum / count;
        const bMean = bSum / count;
        
        // Calculate standard deviations
        const rStd = Math.sqrt((rSqSum / count) - (rMean * rMean));
        const gStd = Math.sqrt((gSqSum / count) - (gMean * gMean));
        const bStd = Math.sqrt((bSqSum / count) - (bMean * bMean));
        
        return {
            mean: { r: rMean, g: gMean, b: bMean },
            std: { r: rStd, g: gStd, b: bStd }
        };
    }
    
    // Helper function to apply color transfer
    function applyColorTransfer(sourceData, targetStats) {
        const data = sourceData.data;
        const sourceStats = calculateStats(sourceData);
        
        // Avoid division by zero
        const eps = 1;
        
        for (let i = 0; i < data.length; i += 4) {
            // For each channel, apply the color transfer formula:
            // result = (source - source_mean) * (target_std / source_std) + target_mean
            
            // Red channel
            data[i] = ((data[i] - sourceStats.mean.r) * 
                      (targetStats.std.r / (sourceStats.std.r + eps)) + 
                      targetStats.mean.r) | 0;
            
            // Green channel
            data[i + 1] = ((data[i + 1] - sourceStats.mean.g) * 
                          (targetStats.std.g / (sourceStats.std.g + eps)) + 
                          targetStats.mean.g) | 0;
            
            // Blue channel
            data[i + 2] = ((data[i + 2] - sourceStats.mean.b) * 
                          (targetStats.std.b / (sourceStats.std.b + eps)) + 
                          targetStats.mean.b) | 0;
            
            // Clamp values to 0-255 range
            data[i] = Math.max(0, Math.min(255, data[i]));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }
        
        return sourceData;
    }
});

// Function to reset all adjustments
function resetAdjustments() {
    const resultPreview = document.getElementById('resultPreview');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Reset sliders
    document.getElementById('brightness').value = 0;
    document.getElementById('contrast').value = 0;
    document.getElementById('saturation').value = 0;
    document.getElementById('temperature').value = 0;
    
    // Reset display values
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrastValue').textContent = '0';
    document.getElementById('saturationValue').textContent = '0';
    document.getElementById('temperatureValue').textContent = '0';
    
    // Reset image to original
    if (originalResult) {
        const resultImg = resultPreview.querySelector('img');
        if (resultImg) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                resultImg.src = originalResult;
                currentResult = originalResult;
                downloadBtn.href = currentResult;
            };
            img.onerror = () => {
                console.error('Error loading image for adjustments');
                isProcessing = false;
            };
            img.src = originalResult;
        }
    }
}
