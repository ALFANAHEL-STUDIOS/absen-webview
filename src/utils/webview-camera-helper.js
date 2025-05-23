/**
 * webview-camera-helper.js
 * Enhanced helper functions for camera access in webview and native app environments
 */

/**
 * Initializes the camera specifically for webview environments
 * with fallback mechanisms for different platforms
 */
export const initCameraForWebview = async (options = {}) => {
  const {
    width = 640,
    height = 480,
    facing = "user",
    onError = null
  } = options;
  
  // Check if running in a webview or Android/iOS environment
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isWebView = checkIfWebView();
  
  console.log(`Camera initialization - Environment detection: Android: ${isAndroid}, iOS: ${isIOS}, WebView: ${isWebView}`);
  
  try {
    // Try different constraints approaches based on environment
    const constraints = [];
    
    // Add device-specific constraints first (more likely to work)
    if (isAndroid) {
      // Android-specific constraints
      constraints.push({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: facing,
          // Some Android webviews work better with these
          frameRate: { ideal: 30 }
        }
      });
    } else if (isIOS) {
      // iOS-specific constraints
      constraints.push({
        video: {
          facingMode: facing,
          // iOS sometimes works better with exact dimensions
          width: { exact: width },
          height: { exact: height }
        }
      });
    }
    
    // Add webview-specific constraints 
    if (isWebView) {
      constraints.push({
        video: {
          // Some webviews work better with min constraints rather than ideal
          width: { min: width/2, ideal: width },
          height: { min: height/2, ideal: height },
          facingMode: facing
        }
      });
    }
    
    // Add generic fallback constraints
    constraints.push(
      // More permissive constraints
      { 
        video: {
          facingMode: facing
        }
      },
      // Most basic constraint as last resort
      { video: true }
    );
    
    // Try constraints in order until one works
    let stream = null;
    let lastError = null;
    
    for (const constraint of constraints) {
      try {
        console.log("Trying camera constraint:", constraint);
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        
        // If we got a stream, break out of the loop
        if (stream) {
          console.log("Successfully obtained camera stream");
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Camera constraint attempt failed:`, err.message || err);
        // Continue to next constraint
      }
    }
    
    // If we still don't have a stream after trying all constraints, throw the last error
    if (!stream) {
      throw lastError || new Error("Failed to access camera after trying all configurations");
    }
    
    return stream;
  } catch (error) {
    console.error("Camera initialization failed:", error);
    
    // Call error callback if provided
    if (onError && typeof onError === 'function') {
      onError(error);
    }
    
    throw error;
  }
};

/**
 * Detects if the current environment is a WebView
 */
const checkIfWebView = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Android WebView detection
  const isAndroidWebView = /wv/.test(userAgent) || 
                         /Android/.test(userAgent) && /Version\//.test(userAgent);
  
  // iOS WebView detection
  const isIOSWebView = (/iphone|ipod|ipad/.test(userAgent) && 
                     !window.navigator.standalone && 
                     !/safari/.test(userAgent)) || 
                     (/iphone|ipod|ipad/.test(userAgent) && window.webkit && 
                     window.webkit.messageHandlers);
  
  // React Native WebView detection
  const isReactNativeWebView = typeof window.ReactNativeWebView !== 'undefined';
  
  // Cordova/Capacitor WebView detection
  const isCordovaWebView = typeof window.cordova !== 'undefined';
  
  return isAndroidWebView || isIOSWebView || isReactNativeWebView || isCordovaWebView;
};

/**
 * Custom function to handle camera orientation changes in mobile webviews
 */
export const handleOrientationChange = (videoElement) => {
  if (!videoElement) return;
  
  // Listen for orientation changes
  const updateOrientation = () => {
    if (typeof window === 'undefined' || !window.screen) return;
    
    // Get current orientation
    const orientation = window.screen.orientation ? 
                      window.screen.orientation.angle : 
                      window.orientation || 0;
    
    console.log("Orientation changed:", orientation);
    
    // Apply CSS transform based on orientation if needed
    if (videoElement.style) {
      // Reset any previous transforms
      videoElement.style.transform = '';
    }
  };
  
  // Listen for orientation changes
  if (typeof window !== 'undefined') {
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', updateOrientation);
    } else if (typeof window.orientation !== 'undefined') {
      window.addEventListener('orientationchange', updateOrientation);
    }
    
    // Initial orientation setup
    updateOrientation();
    
    // Return cleanup function
    return () => {
      if (window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', updateOrientation);
      } else if (typeof window.orientation !== 'undefined') {
        window.removeEventListener('orientationchange', updateOrientation);
      }
    };
  }
};

/**
 * Checks camera availability without requesting permissions
 */
export const checkCameraAvailability = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return false;
  }
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (err) {
    console.error("Error checking camera availability:", err);
    return false;
  }
};

/**
 * Request camera permissions explicitly
 * Helps initialize permissions in webviews before the main camera usage
 */
export const requestCameraPermission = () => {
  // Check if running in WebView
  const isRunningInWebView = checkIfWebView();
  
  if (isRunningInWebView) {
    // Try to request permissions explicitly for WebView
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
          // Permission granted, stop all tracks
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(function(err) {
          console.error("Camera permission error:", err);
        });
    } else {
      console.error("getUserMedia not supported in this WebView");
    }
  }
};

// Auto-initialize on load to help with permissions
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    requestCameraPermission();
  });
}
