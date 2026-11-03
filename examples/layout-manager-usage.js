/**
 * Example: How to integrate LayoutManager with your existing AAC system
 */

// Import the modules
import VisionSystem from '../src/core/VisionSystem.js';
import SimpleAACEngine from '../src/core/SimpleAACEngine.js';
import LayoutManager from '../src/core/LayoutManager.js';

// Initialize the layout manager
const layoutManager = new LayoutManager({
  gridColumns: 6,
  gridRows: 5,
  preserveMotorMemory: true,
  debugMode: true
});

// When vision system detects objects
function onObjectsDetected(detections) {
  // Process through AAC engine
  const vocabulary = aacEngine.processDetections(detections);
  
  // Add core words that should always be available
  const coreWords = [
    { word: 'I', symbol: '👆', isCore: true },
    { word: 'want', symbol: '🤲', isCore: true },
    { word: 'more', symbol: '➕', isCore: true },
    { word: 'stop', symbol: '🛑', isCore: true },
    { word: 'yes', symbol: '✅', isCore: true },
    { word: 'no', symbol: '❌', isCore: true }
  ];
  
  // Combine all vocabulary
  const allVocabulary = [...coreWords, ...vocabulary];
  
  // Detect context (could be enhanced)
  const context = detectContext(detections);
  
  // Get optimal layout
  const layout = layoutManager.layoutVocabulary(allVocabulary, context);
  
  // Render the grid
  renderAACGrid(layout);
}

// Simple context detection
function detectContext(detections) {
  const objects = detections.map(d => d.class);
  
  if (objects.some(obj => ['refrigerator', 'microwave', 'oven'].includes(obj))) {
    return { location: 'kitchen' };
  } else if (objects.some(obj => ['bed', 'pillow', 'blanket'].includes(obj))) {
    return { location: 'bedroom' };
  } else if (objects.some(obj => ['toilet', 'sink', 'bathtub'].includes(obj))) {
    return { location: 'bathroom' };
  }
  
  return { location: 'unknown' };
}

// Render the AAC grid based on layout
function renderAACGrid(layout) {
  const gridContainer = document.getElementById('aac-grid');
  gridContainer.innerHTML = '';
  
  // Create grid
  const gridElement = document.createElement('div');
  gridElement.style.display = 'grid';
  gridElement.style.gridTemplateColumns = `repeat(${layoutManager.config.gridColumns}, 1fr)`;
  gridElement.style.gridTemplateRows = `repeat(${layoutManager.config.gridRows}, 1fr)`;
  gridElement.style.gap = '10px';
  gridElement.style.height = '400px';
  
  // Place each word at its assigned position
  layout.positions.forEach((position, word) => {
    const button = createWordButton(word, position);
    gridElement.appendChild(button);
  });
  
  gridContainer.appendChild(gridElement);
  
  // Animate changes if any
  if (layout.changes.length > 0) {
    animateLayoutChanges(layout.changes);
  }
}

// Create a word button at specific grid position
function createWordButton(word, position) {
  const button = document.createElement('button');
  button.className = 'aac-button';
  button.style.gridColumn = position.col + 1;
  button.style.gridRow = position.row + 1;
  
  // Get symbol from vocabulary
  const symbol = getSymbolForWord(word);
  
  button.innerHTML = `
    <div class="symbol">${symbol}</div>
    <div class="word">${word}</div>
  `;
  
  // Track usage on click
  button.addEventListener('click', () => {
    // Add to sentence
    addToSentence(word);
    
    // Track usage for better future layouts
    layoutManager.trackUsage(word);
    
    // Could trigger re-layout after significant usage changes
    checkForLayoutOptimization();
  });
  
  return button;
}

// Check if layout should be optimized based on usage
function checkForLayoutOptimization() {
  const metrics = layoutManager.getLayoutMetrics();
  
  // Re-layout if usage patterns have changed significantly
  // This is where the "learning" happens
  if (shouldOptimizeLayout(metrics)) {
    const currentVocabulary = getCurrentVocabulary();
    const newLayout = layoutManager.layoutVocabulary(currentVocabulary);
    renderAACGrid(newLayout);
  }
}

// Animation for smooth transitions
function animateLayoutChanges(changes) {
  changes.forEach(change => {
    const button = document.querySelector(`[data-word="${change.word}"]`);
    if (button) {
      button.style.transition = 'all 0.3s ease-out';
      // Animate from old position to new position
    }
  });
}

// Usage example in your existing code:
const visionSystem = new VisionSystem({
  onDetection: (detections) => {
    onObjectsDetected(detections);
  }
});

// The layout manager learns over time:
// - Frequently used words migrate to better positions
// - Core words always stay in the same place (motor memory)
// - Context changes bring relevant words forward
// - New words appear in the "discovery" zone
