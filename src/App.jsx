import { useState, useRef, useCallback } from 'react';
import heic2any from 'heic2any';
import Cropper from 'react-easy-crop';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed for cross-origin if frame is external
    image.src = url;
  });

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [finalImage, setFinalImage] = useState(null);
  
  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const fileInputRef = useRef(null);

  const normalizeUpload = async (file) => {
    if (!file) return null;
    
    // Check if HEIC by extension or type
    const isHeic = file.type === 'image/heic' || 
                   file.type === 'image/heif' || 
                   /\.hei[cf]$/i.test(file.name);
    
    if (isHeic) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        // heic2any can return an array of blobs if it's an image sequence
        return Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      } catch (error) {
        console.error('Error converting HEIC:', error);
        return file; // Fallback to original file
      }
    }
    
    return file;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setIsProcessing(true);
      
      const normalizedFile = await normalizeUpload(file);
      if (normalizedFile) {
        const url = URL.createObjectURL(normalizedFile);
        setImageSrc(url);
      }
      
      setIsProcessing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const generateResult = async () => {
    try {
      setIsGenerating(true);
      
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      const userImage = await createImage(imageSrc);
      
      const frameImage = new Image();
      frameImage.onload = () => {
        ctx.save();
        
        // 1. Draw circular clipping path
        ctx.beginPath();
        ctx.arc(540, 540, 380, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();

        // 2. Draw user image scaled by crop
        const destSize = 380 * 2;
        const destX = 540 - 380;
        const destY = 540 - 380;
        
        ctx.drawImage(
          userImage,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          destX,
          destY,
          destSize,
          destSize
        );

        ctx.restore();

        // 3. Draw frame over the canvas
        ctx.drawImage(frameImage, 0, 0, 1080, 1080);

        // 4. Export as PNG Blob
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error('Canvas generation failed');
            setIsGenerating(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          setFinalImage(url);
          setIsGenerating(false);
        }, 'image/png');
      };
      
      frameImage.onerror = () => {
        console.error("Failed to load /frame-2-fixed.svg");
        // Fallback: draw user image without frame
        ctx.save();
        ctx.beginPath();
        ctx.arc(540, 540, 380, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        const destSize = 380 * 2;
        ctx.drawImage(userImage, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 540 - 380, 540 - 380, destSize, destSize);
        ctx.restore();
        canvas.toBlob((blob) => {
          if (blob) setFinalImage(URL.createObjectURL(blob));
          setIsGenerating(false);
        }, 'image/png');
      };

      frameImage.src = '/frame-2-fixed.svg';

    } catch (e) {
      console.error("Error generating result:", e);
      setIsGenerating(false);
    }
  };

  const handleConfirmCrop = () => {
    generateResult();
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      const response = await fetch(finalImage);
      const blob = await response.blob();
      
      const uploadRes = await fetch('/api/save-result', {
        method: 'POST',
        body: blob,
        headers: {
          'Content-Type': 'image/png'
        }
      });
      
      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await uploadRes.json();
      const uploadedUrl = data.url;
      
      const ourShareLink = `${window.location.origin}/api/share?imgUrl=${encodeURIComponent(uploadedUrl)}`;
      const text = "Just built my HH Goa 2026 badge! #FrameInGoa";
      
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ourShareLink)}`;
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error("Share error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCancelCrop = () => {
    // Reset everything to go back to upload UI
    setImageSrc(null);
    setSelectedFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartOver = () => {
    setFinalImage(null);
    setImageSrc(null);
    setSelectedFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <main className="w-full max-w-md z-10 relative h-full flex flex-col justify-center">
        {finalImage ? (
          // --- FINAL IMAGE UI ---
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center w-full">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 tracking-tight">Your Frame</h2>
              <p className="text-gray-400 text-sm mt-2">Looking good! Save it below.</p>
            </div>

            <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-purple-500/20 ring-1 ring-white/20">
              <img src={finalImage} alt="Final Framed Result" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-col gap-3 w-full">
              <a 
                href={finalImage}
                download="hh-goa-2026.png"
                className="w-full min-h-[56px] py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download
              </a>
              
              <button 
                onClick={handleShare}
                disabled={isSharing}
                className={`w-full min-h-[56px] py-3 px-6 rounded-2xl border border-white/20 font-bold shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                  isSharing 
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                    : 'bg-[#000000] hover:bg-gray-900 text-white active:scale-95'
                }`}
              >
                {isSharing ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.964H5.078z" />
                  </svg>
                )}
                {isSharing ? 'Preparing...' : 'Share to X'}
              </button>

              <button 
                onClick={handleStartOver}
                className="w-full min-h-[56px] py-3 px-6 rounded-2xl border border-white/10 hover:bg-white/5 text-gray-300 font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                Start Over
              </button>
            </div>
          </div>
        ) : !imageSrc ? (
          // --- UPLOAD UI ---
          <>
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Frame Generator
              </h1>
              <p className="text-gray-400 text-lg">Upload your photo to get started</p>
            </div>

            <div 
              className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:border-white/20 hover:shadow-purple-500/10 flex flex-col items-center"
            >
              <div className="w-32 h-32 mb-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px] overflow-hidden">
                <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center overflow-hidden">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="32" 
                    height="32" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="text-gray-300"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
              </div>

              <div className="text-center text-gray-300 mb-8 max-w-[250px] min-h-[48px] flex items-center justify-center">
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing image...
                  </span>
                ) : (
                  "Choose a photo from your gallery or take a new one"
                )}
              </div>

              <input 
                type="file" 
                accept="image/*,.heic,.heif" 
                capture="environment" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isProcessing}
              />

              <button 
                onClick={handleUploadClick}
                disabled={isProcessing}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-300
                  ${isProcessing 
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-white/5' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-blue-500/25 active:scale-95'
                  }`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Upload Photo
              </button>
            </div>
          </>
        ) : (
          // --- CROPPER UI ---
          <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Adjust Photo</h2>
              <p className="text-gray-400 text-sm mt-1">Drag to reposition, pinch to zoom</p>
            </div>

            <div className="relative w-full h-[400px] bg-black/50 rounded-2xl overflow-hidden mb-6">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="mb-8 px-4 flex items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-label="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleCancelCrop}
                disabled={isGenerating}
                className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-semibold transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmCrop}
                disabled={isGenerating}
                className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                  isGenerating 
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed border border-white/5' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-blue-500/25 active:scale-95'
                }`}
              >
                {isGenerating ? (
                  <svg className="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
                {isGenerating ? 'Generating...' : 'Confirm Crop'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
