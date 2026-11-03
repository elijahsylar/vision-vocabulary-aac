/**
 * SimpleAACEngine.js
 * Simplified AAC Engine that just provides words with symbols
 * No phrase generation - users build their own sentences
 */

class SimpleAACEngine {
  constructor(config = {}) {
    this.config = {
      includeCommonWords: config.includeCommonWords !== false,
      debugMode: config.debugMode || false
    };
    
    // Comprehensive symbol mapping
    this.symbolMap = {
      // People & Body
      'person': '👤',
      'face': '😊',
      'hand': '✋',
      
      // Animals
      'bird': '🐦',
      'cat': '🐱',
      'dog': '🐕',
      'horse': '🐴',
      'sheep': '🐑',
      'cow': '🐄',
      'elephant': '🐘',
      'bear': '🐻',
      'zebra': '🦓',
      'giraffe': '🦒',
      
      // Vehicles
      'bicycle': '🚲',
      'car': '🚗',
      'motorcycle': '🏍️',
      'airplane': '✈️',
      'bus': '🚌',
      'train': '🚂',
      'truck': '🚚',
      'boat': '⛵',
      'fire hydrant': '🚒',
      'stop sign': '🛑',
      'parking meter': '🅿️',
      
      // Furniture & Home
      'chair': '🪑',
      'couch': '🛋️',
      'bed': '🛏️',
      'dining table': '🍽️',
      'toilet': '🚽',
      'bench': '🪑',
      'potted plant': '🪴',
      'vase': '🏺',
      
      // Electronics
      'tv': '📺',
      'laptop': '💻',
      'mouse': '🖱️',
      'remote': '📱',
      'keyboard': '⌨️',
      'cell phone': '📱',
      
      // Kitchen & Food
      'bottle': '🍼',
      'wine glass': '🍷',
      'cup': '☕',
      'fork': '🍴',
      'knife': '🔪',
      'spoon': '🥄',
      'bowl': '🍜',
      'banana': '🍌',
      'apple': '🍎',
      'sandwich': '🥪',
      'orange': '🍊',
      'broccoli': '🥦',
      'carrot': '🥕',
      'hot dog': '🌭',
      'pizza': '🍕',
      'donut': '🍩',
      'cake': '🎂',
      'microwave': '🔥',
      'oven': '♨️',
      'toaster': '🍞',
      'sink': '🚰',
      'refrigerator': '❄️',
      
      // Objects
      'backpack': '🎒',
      'umbrella': '☂️',
      'handbag': '👜',
      'tie': '👔',
      'suitcase': '🧳',
      'book': '📚',
      'clock': '🕐',
      'scissors': '✂️',
      'teddy bear': '🧸',
      'hair drier': '💨',
      'toothbrush': '🪥',
      
      // Sports & Toys
      'frisbee': '🥏',
      'skis': '🎿',
      'snowboard': '🏂',
      'sports ball': '⚽',
      'kite': '🪁',
      'baseball bat': '🏏',
      'baseball glove': '🥊',
      'skateboard': '🛹',
      'surfboard': '🏄',
      'tennis racket': '🎾',
      
      // Default
      'unknown': '❓'
    };
    
    // Common AAC core vocabulary
    this.commonWords = [
      // Pronouns
      { word: 'I', symbol: '👆', category: 'pronoun', priority: 10 },
      { word: 'you', symbol: '👉', category: 'pronoun', priority: 10 },
      { word: 'it', symbol: '👇', category: 'pronoun', priority: 9 },
      { word: 'we', symbol: '👥', category: 'pronoun', priority: 8 },
      
      // Verbs
      { word: 'want', symbol: '🤲', category: 'verb', priority: 10 },
      { word: 'need', symbol: '❗', category: 'verb', priority: 10 },
      { word: 'see', symbol: '👀', category: 'verb', priority: 9 },
      { word: 'have', symbol: '✊', category: 'verb', priority: 8 },
      { word: 'go', symbol: '🚶', category: 'verb', priority: 9 },
      { word: 'eat', symbol: '🍴', category: 'verb', priority: 8 },
      { word: 'drink', symbol: '🥤', category: 'verb', priority: 8 },
      { word: 'play', symbol: '🎮', category: 'verb', priority: 8 },
      { word: 'like', symbol: '❤️', category: 'verb', priority: 9 },
      { word: 'help', symbol: '🆘', category: 'verb', priority: 9 },
      
      // Descriptors
      { word: 'more', symbol: '➕', category: 'descriptor', priority: 10 },
      { word: 'all done', symbol: '✅', category: 'descriptor', priority: 9 },
      { word: 'stop', symbol: '🛑', category: 'descriptor', priority: 10 },
      { word: 'yes', symbol: '✅', category: 'descriptor', priority: 10 },
      { word: 'no', symbol: '❌', category: 'descriptor', priority: 10 },
      { word: 'big', symbol: '🔶', category: 'descriptor', priority: 7 },
      { word: 'little', symbol: '▪️', category: 'descriptor', priority: 7 },
      { word: 'good', symbol: '👍', category: 'descriptor', priority: 8 },
      { word: 'bad', symbol: '👎', category: 'descriptor', priority: 8 },
      
      // Social
      { word: 'please', symbol: '🙏', category: 'social', priority: 9 },
      { word: 'thank you', symbol: '🙏', category: 'social', priority: 9 },
      { word: 'sorry', symbol: '😔', category: 'social', priority: 8 },
      { word: 'hello', symbol: '👋', category: 'social', priority: 8 },
      { word: 'bye', symbol: '👋', category: 'social', priority: 8 },
      
      // Question words
      { word: 'what', symbol: '❓', category: 'question', priority: 8 },
      { word: 'where', symbol: '📍', category: 'question', priority: 8 },
      { word: 'when', symbol: '🕐', category: 'question', priority: 7 },
      { word: 'who', symbol: '👤', category: 'question', priority: 7 },
      { word: 'why', symbol: '🤷', category: 'question', priority: 7 }
    ];
  }
  
  /**
   * Process detected objects into simple word vocabulary
   */
  processDetections(detections) {
    const vocabulary = detections.map(detection => {
      const symbol = this.symbolMap[detection.class] || this.symbolMap['unknown'];
      
      return {
        word: detection.class,
        symbol: symbol,
        category: 'object',
        confidence: detection.score,
        isDetected: true
      };
    });
    
    this.log('Generated vocabulary:', vocabulary);
    return vocabulary;
  }
  
  /**
   * Get common/core vocabulary words
   */
  getCommonWords() {
    if (!this.config.includeCommonWords) {
      return [];
    }
    
    // Return sorted by priority; core words keep fixed positions in LayoutManager
    return [...this.commonWords]
      .map((w) => ({ ...w, isCore: true }))
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Get all vocabulary (detected + common)
   */
  getAllVocabulary(detections) {
    const detectedWords = this.processDetections(detections);
    const commonWords = this.getCommonWords();
    
    return {
      detected: detectedWords,
      common: commonWords
    };
  }
  
  /**
   * Build sentence from word array
   */
  buildSentence(words) {
    return words.join(' ');
  }
  
  /**
   * Get symbol for any word
   */
  getSymbol(word) {
    // Check if it's a detected object
    if (this.symbolMap[word]) {
      return this.symbolMap[word];
    }
    
    // Check if it's a common word
    const commonWord = this.commonWords.find(w => w.word === word);
    if (commonWord) {
      return commonWord.symbol;
    }
    
    // Default
    return '❓';
  }
  
  /**
   * Add custom word mapping
   */
  addCustomWord(word, symbol, category = 'custom') {
    this.commonWords.push({
      word: word,
      symbol: symbol,
      category: category,
      priority: 5
    });
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Logging helper
   */
  log(...args) {
    if (this.config.debugMode) {
      console.log('[SimpleAACEngine]', ...args);
    }
  }
}

export default SimpleAACEngine;
