# StyleGrader

StyleGrader is a web-based application that transfers the color style from one image to another. Built with vanilla JavaScript, HTML, and CSS, it runs entirely in the browser with no server-side processing required.

## Features

- **Color Style Transfer**: Apply the color characteristics of a reference image to your source image
- **Real-time Adjustments**: Fine-tune the result with brightness, contrast, saturation, and temperature controls
- **No Server Required**: All processing happens directly in the browser
- **Responsive Design**: Works on both desktop and mobile devices
- **Download Results**: Save your styled images with a single click

## How It Works

StyleGrader uses statistical color transfer to match the color distribution of the reference image to the source image. The algorithm:

1. Analyzes the mean and standard deviation of each color channel (RGB) in both images
2. Transforms the source image's colors to match the reference image's statistical properties
3. Preserves the source image's structure while applying the new color characteristics

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- No installation or server required

### Usage

1. Open `static/index.html` in your web browser
2. Upload a source image (the image you want to style)
3. Upload a reference image (the image with the desired color style)
4. Click "Process Images" to apply the color transfer
5. Use the sliders to fine-tune the result if needed
6. Click "Download Result" to save your styled image

## File Structure

```
StyleGrader/
├── static/
│   ├── index.html      # Main application interface
│   ├── app.js          # JavaScript for image processing and UI
│   ├── style.css       # Styling for the application
│   └── results/        # Directory for processed images
└── README.md           # This file
```

## Customization

You can modify the following aspects of the application:

- **Styling**: Edit `style.css` to change the look and feel
- **Image Processing**: Adjust the color transfer algorithm in `app.js`
- **UI**: Modify the interface in `index.html`

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with vanilla JavaScript, HTML5 Canvas, and CSS3
- Inspired by traditional color transfer algorithms in computer vision
