import { useRef, useState, useCallback } from "react";
import { Camera, CameraOff, CircleDot } from "lucide-react";

interface WebcamCaptureProps {
  onCapture: (imageData: string) => void;
  capturedImage?: string | null;
}

// WebcamCapture component
const WebcamCapture = ({ onCapture, capturedImage }: WebcamCaptureProps) => {
  // Reference for the video element
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reference for the hidden canvas used to capture the image
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reference for storing the camera stream
  const streamRef = useRef<MediaStream | null>(null);

  // State to check whether camera is active or not
  const [isActive, setIsActive] = useState(false);

  // Function to start the camera
  const startCamera = useCallback(async () => {
    try {
      // Request access to the user's webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });

      // Save the stream reference
      streamRef.current = stream;

      // Attach the stream to the video element and play it
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Mark camera as active
      setIsActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  }, []);

  // Function to stop the camera
  const stopCamera = useCallback(() => {
    // Stop all video tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Remove the stream from the video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Mark camera as inactive
    setIsActive(false);
  }, []);

  // Function to capture an image from the webcam
  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Check if video is ready before capturing
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      alert("Camera is not ready yet. Please wait a moment and try again.");
      return;
    }

    // Set canvas size equal to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0);

    // Convert captured image to JPEG data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    // Send captured image data to parent component
    onCapture(dataUrl);

    // Stop camera after capture
    stopCamera();
  }, [onCapture, stopCamera]);

  return (
    <div className="space-y-4">
      {/* Camera preview area */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary border border-border">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isActive ? "block" : "hidden"}`}
        />

        {/* Show captured image when camera is off */}
        {!isActive && capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured webcam"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}

        {/* Show placeholder when camera is off and no image is captured */}
        {!isActive && !capturedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Camera is off</p>
          </div>
        )}
      </div>

      {/* Hidden canvas used for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera control buttons */}
      <div className="flex gap-3 justify-center">
        {!isActive ? (
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Camera className="w-4 h-4" />
            {capturedImage ? "Retake" : "Start Camera"}
          </button>
        ) : (
          <>
            {/* Capture button */}
            <button
              onClick={capture}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <CircleDot className="w-4 h-4" />
              Capture
            </button>

            {/* Stop camera button */}
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-accent transition-colors"
            >
              <CameraOff className="w-4 h-4" />
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;