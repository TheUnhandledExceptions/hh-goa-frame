import { useState, useRef, useCallback, useEffect } from 'react';
import heic2any from 'heic2any';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed for cross-origin if frame is external
    image.src = url;
  });

let faceDetectorInstance = null;
const initFaceDetector = async () => {
  if (faceDetectorInstance) return faceDetectorInstance;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    faceDetectorInstance = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        delegate: "GPU"
      },
      runningMode: "IMAGE"
    });
    return faceDetectorInstance;
  } catch (error) {
    console.error("Failed to initialize FaceDetector:", error);
    return null;
  }
};

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [finalImage, setFinalImage] = useState(null);
  
  // Format B states
  const [format, setFormat] = useState('A');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  
  // Console state
  const [logs, setLogs] = useState([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}`].slice(-10));
  };
  
  // Hackathon Status
  const [isHackathonActive, setIsHackathonActive] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.isHackathonActive !== undefined) {
          setIsHackathonActive(data.isHackathonActive);
        }
      })
      .catch(err => console.error('Failed to fetch status:', err));
  }, []);
  
  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const fileInputRef = useRef(null);

  const normalizeUpload = async (file) => {
    if (!file) return null;
    
    let currentFile = file;
    // Check if HEIC by extension or type
    const isHeic = file.type === 'image/heic' || 
                   file.type === 'image/heif' || 
                   /\.hei[cf]$/i.test(file.name);
    
    if (isHeic) {
      setUploadStatus('Converting HEIC...');
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        // heic2any can return an array of blobs if it's an image sequence
        currentFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      } catch (error) {
        console.error('Error converting HEIC:', error);
      }
    }
    
    setUploadStatus('Compressing...');
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1500,
        useWebWorker: true,
      };
      currentFile = await imageCompression(currentFile, options);
    } catch (error) {
      console.error('Error compressing image:', error);
    }
    
    return currentFile;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setIsProcessing(true);
      setUploadStatus('Processing image...');
      addLog('[SYS] Reading raw file data...');
      
      const normalizedFile = await normalizeUpload(file);
      if (normalizedFile) {
        addLog('[SYS] Normalizing HEIC/image asset...');
        const url = URL.createObjectURL(normalizedFile);
        
        // Face detection auto-crop
        setUploadStatus('AI Face Detection...');
        addLog('[AI] Initializing MediaPipe FaceDetector...');
        try {
          const detector = await initFaceDetector();
          if (detector) {
            const imageElement = await createImage(url);
            const detections = detector.detect(imageElement);
            
            if (detections.detections && detections.detections.length > 0) {
              const face = detections.detections[0].boundingBox;
              const faceCenterX = face.originX + face.width / 2;
              const faceCenterY = face.originY + face.height / 2;
              
              const imageWidth = imageElement.width;
              const imageHeight = imageElement.height;
              
              const cropX = imageWidth / 2 - faceCenterX;
              const cropY = imageHeight / 2 - faceCenterY;
              
              setCrop({ x: cropX, y: cropY });
              setZoom(1.5);
            } else {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }
          }
        } catch (error) {
          console.error("Error during face detection:", error);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
        }
        
        setImageSrc(url);
      }
      
      setIsProcessing(false);
      setUploadStatus('');
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
      addLog('[NEXUS] Initializing rendering engine...');
      
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      const userImage = await createImage(imageSrc);
      
      const frameImage = new Image();
      frameImage.onload = () => {
        addLog('[NEXUS] Merging raster layers at 300 DPI...');
        ctx.save();
        
        // 1. Draw circular clipping path
        ctx.beginPath();
        ctx.arc(540, 540, 485, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();

        // 2. Draw user image scaled by crop
        const destSize = 485 * 2;
        const destX = 540 - 485;
        const destY = 540 - 485;
        
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

        // Optional Format B text rendering
        if (format === 'B') {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Draw Name
          let nameYEnd = 800;
          if (name) {
            const nameFont = 'bold 64px sans-serif';
            ctx.font = nameFont;
            ctx.fillStyle = '#FFFFFF';
            const nameHandle = prepareWithSegments(name, nameFont);
            const nameResult = layoutWithLines(nameHandle, 600, 72);
            let currentY = 800;
            
            nameResult.lines.forEach(line => {
              ctx.fillText(line.text, 540, currentY);
              currentY += 72;
            });
            nameYEnd = currentY;
          }

          // Draw Role
          if (role) {
            const roleFont = '40px sans-serif';
            ctx.font = roleFont;
            ctx.fillStyle = '#A855F7'; // Tailwind purple-500
            const roleHandle = prepareWithSegments(role, roleFont);
            const roleResult = layoutWithLines(roleHandle, 600, 48);
            let currentY = nameYEnd + 10;
            
            roleResult.lines.forEach(line => {
              ctx.fillText(line.text, 540, currentY);
              currentY += 48;
            });
          }
        }

        // 4. Export as PNG Blob
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error('Canvas generation failed');
            setIsGenerating(false);
            return;
          }
          addLog('[SUCCESS] Output compiled to memory.');
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
        ctx.arc(540, 540, 485, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.clip();
        const destSize = 485 * 2;
        ctx.drawImage(userImage, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 540 - 485, 540 - 485, destSize, destSize);
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
      addLog('[UPLINK] Initiating secure transmission...');
      
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
      addLog('[SUCCESS] Transmission complete. Blob synced.');
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
    <div className="min-h-screen bg-hh-green flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-hh-pink/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-hh-yellow/20 rounded-full blur-[100px] pointer-events-none"></div>

      <main className="w-full max-w-md z-10 relative h-full flex flex-col justify-center">
        {finalImage ? (
          // --- FINAL IMAGE UI ---
          <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center w-full">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-extrabold text-hh-yellow tracking-tight">Your Frame</h2>
              <p className="text-white/80 text-sm mt-2">Looking good! Save it below.</p>
            </div>

            <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-hh-pink/20 ring-1 ring-white/20">
              <img src={finalImage} alt="Final Framed Result" className="w-full h-full object-contain" />
            </div>

            <div className="flex flex-col gap-3 w-full">
              <a 
                href={finalImage}
                download="hh-goa-2026.png"
                className="w-full min-h-[56px] py-3 px-6 rounded-2xl bg-hh-pink hover:bg-hh-yellow hover:text-black text-white font-bold shadow-lg shadow-hh-pink/25 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2"
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
                    ? 'bg-black/50 text-white/50 cursor-not-allowed' 
                    : 'bg-black hover:bg-white/10 text-white active:scale-95'
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
                className="w-full min-h-[56px] py-3 px-6 rounded-2xl border border-white/20 hover:bg-white/10 text-white font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
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
              <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-hh-yellow">
                Frame Generator
              </h1>
              <p className="text-white/80 text-lg">Upload your photo to get started</p>
            </div>

            <div 
              className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:border-white/30 hover:shadow-hh-pink/10 flex flex-col items-center"
            >
              <div className="flex bg-black/40 p-1 rounded-xl mb-8 w-full max-w-[250px]">
                <button 
                  onClick={() => setFormat('A')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${format === 'A' ? 'bg-hh-pink text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                >
                  Format A (PFP)
                </button>
                <button 
                  onClick={() => setFormat('B')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${format === 'B' ? 'bg-hh-pink text-white shadow-md' : 'text-white/60 hover:text-white'}`}
                >
                  Format B (ID)
                </button>
              </div>

              <div className="w-32 h-32 mb-6 rounded-full bg-hh-pink p-[2px] overflow-hidden">
                <div className="w-full h-full bg-hh-green rounded-full flex items-center justify-center overflow-hidden">
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
                    className="text-white/80"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
              </div>

              <div className="text-center text-white/80 mb-8 max-w-[250px] min-h-[48px] flex items-center justify-center">
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-hh-yellow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploadStatus || 'Processing image...'}
                  </span>
                ) : !isHackathonActive ? (
                  <span className="text-hh-pink font-bold text-sm bg-black/40 px-4 py-2 rounded-lg border border-hh-pink/30">
                    The hackathon submission period has ended.
                  </span>
                ) : (
                  "Choose a photo from your gallery or take a new one"
                )}
              </div>

              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isProcessing || !isHackathonActive}
              />

              <button 
                onClick={handleUploadClick}
                disabled={isProcessing || !isHackathonActive}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all duration-300
                  ${(isProcessing || !isHackathonActive) 
                    ? 'bg-black/50 text-white/50 cursor-not-allowed border border-white/5' 
                    : 'bg-hh-pink hover:bg-hh-yellow hover:text-black text-white shadow-hh-pink/25 active:scale-95'
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
          <div className="bg-black/20 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-hh-yellow tracking-tight">Adjust Photo</h2>
              <p className="text-white/80 text-sm mt-1">Drag to reposition, pinch to zoom</p>
            </div>

            {format === 'B' && (
              <div className="mb-6 flex flex-col gap-3 w-full">
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-hh-yellow"
                />
                <div className="flex gap-2 w-full">
                  <input 
                    type="text" 
                    placeholder="Your Role" 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-hh-pink"
                  />
                  <button 
                    onClick={() => {
                      const roles = ['Spaghetti Code Architect', 'CSS Whisperer', 'Git Force-Pusher', 'YAML Wrangler', 'API Alchemist'];
                      setRole(roles[Math.floor(Math.random() * roles.length)]);
                    }}
                    className="bg-hh-pink hover:bg-hh-yellow hover:text-black text-white px-4 rounded-xl font-bold transition-colors text-sm whitespace-nowrap"
                  >
                    Random
                  </button>
                </div>
              </div>
            )}

            <div className="relative w-full h-[400px] bg-black/50 rounded-2xl overflow-hidden mb-6 border border-white/10">
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
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
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-hh-yellow"
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleCancelCrop}
                disabled={isGenerating}
                className="flex-1 py-3 px-4 rounded-xl border border-white/20 hover:bg-white/10 text-white font-semibold transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmCrop}
                disabled={isGenerating}
                className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                  isGenerating 
                    ? 'bg-black/50 text-white/50 cursor-not-allowed border border-white/5' 
                    : 'bg-hh-pink hover:bg-hh-yellow hover:text-black text-white shadow-lg shadow-hh-pink/25 active:scale-95'
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

      {/* System Console */}
      <div className="z-10 mt-6 w-full max-w-md font-mono text-xs">
        <button 
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className="w-full flex items-center justify-between text-hh-yellow/60 hover:text-hh-yellow transition-colors border-t border-white/10 pt-4 focus:outline-none"
        >
          <span>&gt; System Console [SYS_OK]</span>
          <span>{isConsoleOpen ? '[-]' : '[+]'}</span>
        </button>
        
        {isConsoleOpen && (
          <div className="mt-2 bg-black/80 border border-white/10 rounded-lg p-3 max-h-32 overflow-y-auto w-full shadow-2xl">
            {logs.length === 0 ? (
              <div className="text-white/40 italic">Awaiting instructions...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-hh-yellow/80 break-words mb-1 last:mb-0">
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
