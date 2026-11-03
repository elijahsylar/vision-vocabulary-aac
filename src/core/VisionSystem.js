/**
 * VisionSystem.js
 * Core vision processing module for VisionVocabularyAAC
 * Handles camera input and object detection
 */

import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

class VisionSystem {
  constructor(config = {}) {
    // Configuration
    this.config = {
      confidenceThreshold: config.confidenceThreshold || 0.6,
      maxDetections: config.maxDetections || 10,
      frameSkip: config.frameSkip || 3, // Process every Nth frame
      debugMode: config.debugMode || false
    };
    
    // State
    this.model = null;
    this.isReady = false;
    this.stream = null;
    this.frameCount = 0;
    this.lastDetections = [];
    
    // Callbacks
    this.onDetection = config.onDetection || null;
    this.onReady = config.onReady || null;
    this.onError = config.onError || null;
  }
  
  /**
   * Initialize the vision system
   */
  async initialize() {
    try {
      this.log('Initializing Vision System...');
      
      // Load the COCO-SSD model
      await this.loadModel();
      
      // Set up camera access
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
  
  /**
   * Load the TensorFlow.js model
   */
  async loadModel() {
    this.log('Loading COCO-SSD model...');
    
    try {
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2' // Lighter model for mobile devices
      });
      
      // Warm up the model with a dummy prediction
      const dummyImage = tf.zeros([1, 1, 3]);
      await this.model.detect(dummyImage);
      dummyImage.dispose();
      
      this.log('Model loaded successfully');
    } catch (error) {
      throw new Error(`Model loading failed: ${error.message}`);
    }
  }
  
  /**
   * Set up camera access
   */
  async setupCamera() {
    this.log('Requesting camera access...');
    
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.log('Camera access granted');
      
    } catch (error) {
      throw new Error(`Camera access denied: ${error.message}`);
    }
  }
  
  /**
   * Start processing video frames
   */
  startProcessing(videoElement) {
    if (!this.isReady) {
      this.handleError('System not initialized', new Error('Call initialize() first'));
      return;
    }
    
    // Attach stream to video element
    videoElement.srcObject = this.stream;
    
    // Start processing loop
    this.processFrame(videoElement);
  }
  
  /**
   * Process a single video frame
   */
  async processFrame(videoElement) {
    // Skip frames for performance
    this.frameCount++;
    if (this.frameCount % this.config.frameSkip !== 0) {
      requestAnimationFrame(() => this.processFrame(videoElement));
      return;
    }
    
    try {
      // Detect objects in current frame
      const detections = await this.model.detect(videoElement);
      
      // Filter by confidence threshold
      const filteredDetections = detections.filter(
        detection => detection.score >= this.config.confidenceThreshold
      );
      
      // Deduplicate detections
      const uniqueDetections = this.deduplicateDetections(filteredDetections);
      
      // Limit number of detections
      const finalDetections = uniqueDetections.slice(0, this.config.maxDetections);
      
      // Store for reference
      this.lastDetections = finalDetections;
      
      // Trigger callback if detections changed
      if (this.onDetection && this.detectionsChanged(finalDetections)) {
        this.onDetection(finalDetections);
      }
      
      if (this.config.debugMode) {
        this.logDetections(finalDetections);
      }
      
    } catch (error) {
      this.handleError('Frame processing error', error);
    }
    
    // Continue processing
    requestAnimationFrame(() => this.processFrame(videoElement));
  }
  
  /**
   * Remove duplicate detections of the same object
   */
  deduplicateDetections(detections) {
    const grouped = new Map();
    
    detections.forEach(detection => {
      const key = detection.class;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key).push(detection);
    });
    
    // Keep only highest confidence detection per class
    const deduplicated = [];
    grouped.forEach((group, className) => {
      const best = group.reduce((prev, current) => 
        current.score > prev.score ? current : prev
      );
      deduplicated.push(best);
    });
    
    return deduplicated;
  }
  
  /**
   * Check if detections have changed significantly
   */
  detectionsChanged(newDetections) {
    if (newDetections.length !== this.lastDetections.length) {
      return true;
    }
    
    const newClasses = new Set(newDetections.map(d => d.class));
    const oldClasses = new Set(this.lastDetections.map(d => d.class));
    
    // Check if sets are equal
    if (newClasses.size !== oldClasses.size) return true;
    for (let item of newClasses) {
      if (!oldClasses.has(item)) return true;
    }
    
    return false;
  }
  
  /**
   * Stop the vision system
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.isReady = false;
    this.log('Vision System stopped');
  }
  
  /**
   * Get current detections
   */
  getCurrentDetections() {
    return this.lastDetections;
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated', this.config);
  }
  
  /**
   * Logging helper
   */
  log(...args) {
    if (this.config.debugMode) {
      console.log('[VisionSystem]', ...args);
    }
  }
  
  /**
   * Log detections in readable format
   */
  logDetections(detections) {
    const summary = detections.map(d => 
      `${d.class} (${Math.round(d.score * 100)}%)`
    ).join(', ');
    
    this.log('Detected:', summary || 'Nothing');
  }
  
  /**
   * Error handling
   */
  handleError(context, error) {
    console.error(`[VisionSystem] ${context}:`, error);
    
    if (this.onError) {
      this.onError({ context, error });
    }
  }
}

export default VisionSystem;
