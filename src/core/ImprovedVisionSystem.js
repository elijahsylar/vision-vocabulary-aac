/**
 * ImprovedVisionSystem.js
 * Enhanced vision processing with better accuracy and stability
 */

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

class ImprovedVisionSystem {
  constructor(config = {}) {
    // Configuration with better defaults
    this.config = {
      confidenceThreshold: config.confidenceThreshold || 0.7, // Higher threshold
      maxDetections: config.maxDetections || 6, // Fewer, better detections
      frameSkip: config.frameSkip || 2, // Process more frames
      stabilityFrames: config.stabilityFrames || 3, // Object must appear in N frames
      debugMode: config.debugMode || false,
      modelSize: config.modelSize || 'lite_mobilenet_v2' // Can try 'mobilenet_v2' for better accuracy
    };
    
    // State
    this.model = null;
    this.isReady = false;
    this.stream = null;
    this.frameCount = 0;
    
    // Detection history for stability
    this.detectionHistory = [];
    this.stableDetections = [];
    
    // Callbacks
    this.onDetection = config.onDetection || null;
    this.onReady = config.onReady || null;
    this.onError = config.onError || null;
  }
  
  async initialize() {
    try {
      this.log('Initializing Improved Vision System...');
      
      // Load model with better base
      await this.loadModel();
      
      // Set up camera with optimal settings
      await this.setupCamera();
      
      this.isReady = true;
      this.log('Vision System ready!');
      
      if (this.onReady) {
        this.onReady();
      }
      
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }
  
  async loadModel() {
    this.log('Loading enhanced model...');
    
    try {
      // Use better model for accuracy
      this.model = await cocoSsd.load({
        base: this.config.modelSize // 'mobilenet_v2' is more accurate than 'lite_mobilenet_v2'
      });
      
      // Warm up
      const dummyImage = tf.zeros([1, 1, 3]);
      await this.model.detect(dummyImage);
      dummyImage.dispose();
      
      this.log('Model loaded successfully');
    } catch (error) {
      throw new Error(`Model loading failed: ${error.message}`);
    }
  }
  
  async setupCamera() {
    this.log('Requesting camera access...');
    
    try {
      // Better camera constraints for clearer image
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 }, // Higher resolution
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30 } // Smooth framerate
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log actual constraints
      const track = this.stream.getVideoTracks()[0];
      const settings = track.getSettings();
      this.log('Camera settings:', settings);
      
    } catch (error) {
      throw new Error(`Camera access denied: ${error.message}`);
    }
  }
  
  startProcessing(videoElement) {
    if (!this.isReady) {
      this.handleError('System not initialized', new Error('Call initialize() first'));
      return;
    }
    
    videoElement.srcObject = this.stream;
    
    // Wait for video to be ready
    videoElement.onloadedmetadata = () => {
      this.processFrame(videoElement);
    };
  }
  
  async processFrame(videoElement) {
    this.frameCount++;
    
    if (this.frameCount % this.config.frameSkip !== 0) {
      requestAnimationFrame(() => this.processFrame(videoElement));
      return;
    }
    
    try {
      // Detect objects
      const rawDetections = await this.model.detect(videoElement);
      
      // Apply stricter filtering
      const filteredDetections = this.filterDetections(rawDetections);
      
      // Add to history for stability
      this.updateDetectionHistory(filteredDetections);
      
      // Get stable detections
      const stableDetections = this.getStableDetections();
      
      // Only trigger callback if stable detections changed
      if (this.detectionsChanged(stableDetections)) {
        this.stableDetections = stableDetections;
        if (this.onDetection) {
          this.onDetection(stableDetections);
        }
      }
      
    } catch (error) {
      this.handleError('Frame processing error', error);
    }
    
    requestAnimationFrame(() => this.processFrame(videoElement));
  }
  
  filterDetections(detections) {
    // Apply confidence threshold
    let filtered = detections.filter(d => d.score >= this.config.confidenceThreshold);
    
    // Remove detections that are too small (likely false positives)
    filtered = filtered.filter(d => {
      const [x, y, width, height] = d.bbox;
      const area = width * height;
      return area > 1000; // Minimum area threshold
    });
    
    // Sort by confidence
    filtered.sort((a, b) => b.score - a.score);
    
    // Deduplicate overlapping detections
    const deduplicated = this.deduplicateOverlapping(filtered);
    
    // Limit to max detections
    return deduplicated.slice(0, this.config.maxDetections);
  }
  
  deduplicateOverlapping(detections) {
    const kept = [];
    
    for (const detection of detections) {
      let shouldKeep = true;
      
      for (const existing of kept) {
        if (existing.class === detection.class && this.isOverlapping(existing.bbox, detection.bbox)) {
          shouldKeep = false;
          break;
        }
      }
      
      if (shouldKeep) {
        kept.push(detection);
      }
    }
    
    return kept;
  }
  
  isOverlapping(bbox1, bbox2, threshold = 0.3) {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;
    
    // Calculate intersection
    const xOverlap = Math.max(0, Math.min(x1 + w1, x2 + w2) - Math.max(x1, x2));
    const yOverlap = Math.max(0, Math.min(y1 + h1, y2 + h2) - Math.max(y1, y2));
    const intersection = xOverlap * yOverlap;
    
    // Calculate union
    const area1 = w1 * h1;
    const area2 = w2 * h2;
    const union = area1 + area2 - intersection;
    
    // IoU (Intersection over Union)
    return (intersection / union) > threshold;
  }
  
  updateDetectionHistory(detections) {
    // Keep only recent frames
    this.detectionHistory.push(detections);
    if (this.detectionHistory.length > this.config.stabilityFrames) {
      this.detectionHistory.shift();
    }
  }
  
  getStableDetections() {
    if (this.detectionHistory.length < this.config.stabilityFrames) {
      return []; // Not enough history yet
    }
    
    // Count the frames each object class appears in (once per frame, so
    // two cups in one frame are still one frame)
    const classCount = new Map();
    
    for (const frameDetections of this.detectionHistory) {
      for (const className of new Set(frameDetections.map(d => d.class))) {
        classCount.set(className, (classCount.get(className) || 0) + 1);
      }
    }
    
    // Get objects that appear in at least 60% of frames (2 of 3, not 1)
    const stableClasses = [];
    const requiredFrames = Math.ceil(this.config.stabilityFrames * 0.6);
    
    for (const [className, count] of classCount) {
      if (count >= requiredFrames) {
        stableClasses.push(className);
      }
    }
    
    // Get the best detection for each stable class
    const stableDetections = [];
    for (const className of stableClasses) {
      let bestDetection = null;
      let bestScore = 0;
      
      // Find highest confidence detection of this class
      for (const frameDetections of this.detectionHistory) {
        for (const detection of frameDetections) {
          if (detection.class === className && detection.score > bestScore) {
            bestScore = detection.score;
            bestDetection = detection;
          }
        }
      }
      
      if (bestDetection) {
        stableDetections.push(bestDetection);
      }
    }
    
    return stableDetections;
  }
  
  detectionsChanged(newDetections) {
    if (newDetections.length !== this.stableDetections.length) {
      return true;
    }
    
    const newClasses = new Set(newDetections.map(d => d.class));
    const oldClasses = new Set(this.stableDetections.map(d => d.class));
    
    if (newClasses.size !== oldClasses.size) return true;
    for (let item of newClasses) {
      if (!oldClasses.has(item)) return true;
    }
    
    return false;
  }
  
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isReady = false;
    this.detectionHistory = [];
    this.stableDetections = [];
    this.log('Vision System stopped');
  }
  
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated', this.config);
  }
  
  log(...args) {
    if (this.config.debugMode) {
      console.log('[ImprovedVision]', ...args);
    }
  }
  
  handleError(context, error) {
    console.error(`[ImprovedVision] ${context}:`, error);
    if (this.onError) {
      this.onError({ context, error });
    }
  }
}

export default ImprovedVisionSystem;
