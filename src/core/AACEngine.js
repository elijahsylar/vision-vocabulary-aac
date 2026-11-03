/**
 * AACEngine.js
 * Transforms detected objects into AAC vocabulary and phrases
 * Core intelligence for VisionVocabularyAAC
 */

class AACEngine {
  constructor(config = {}) {
    this.config = {
      maxPhrasesPerObject: config.maxPhrasesPerObject || 4,
      enablePrediction: config.enablePrediction || true,
      debugMode: config.debugMode || false
    };
    
    // Symbol mapping - starting with emojis, will add SymbolStix later
    this.symbolMap = {
      // People & Body
      'person': { symbol: '👤', category: 'people' },
      'face': { symbol: '😊', category: 'people' },
      'hand': { symbol: '✋', category: 'body' },
      
      // Animals
      'bird': { symbol: '🐦', category: 'animal' },
      'cat': { symbol: '🐱', category: 'animal' },
      'dog': { symbol: '🐕', category: 'animal' },
      'horse': { symbol: '🐴', category: 'animal' },
      'sheep': { symbol: '🐑', category: 'animal' },
      'cow': { symbol: '🐄', category: 'animal' },
      'elephant': { symbol: '🐘', category: 'animal' },
      'bear': { symbol: '🐻', category: 'animal' },
      'zebra': { symbol: '🦓', category: 'animal' },
      'giraffe': { symbol: '🦒', category: 'animal' },
      
      // Vehicles
      'bicycle': { symbol: '🚲', category: 'vehicle' },
      'car': { symbol: '🚗', category: 'vehicle' },
      'motorcycle': { symbol: '🏍️', category: 'vehicle' },
      'airplane': { symbol: '✈️', category: 'vehicle' },
      'bus': { symbol: '🚌', category: 'vehicle' },
      'train': { symbol: '🚂', category: 'vehicle' },
      'truck': { symbol: '🚚', category: 'vehicle' },
      'boat': { symbol: '⛵', category: 'vehicle' },
      
      // Furniture & Home
      'chair': { symbol: '🪑', category: 'furniture' },
      'couch': { symbol: '🛋️', category: 'furniture' },
      'bed': { symbol: '🛏️', category: 'furniture' },
      'dining table': { symbol: '🪑', category: 'furniture' },
      'toilet': { symbol: '🚽', category: 'furniture' },
      
      // Electronics
      'tv': { symbol: '📺', category: 'electronics' },
      'laptop': { symbol: '💻', category: 'electronics' },
      'mouse': { symbol: '🖱️', category: 'electronics' },
      'remote': { symbol: '📱', category: 'electronics' },
      'keyboard': { symbol: '⌨️', category: 'electronics' },
      'cell phone': { symbol: '📱', category: 'electronics' },
      
      // Kitchen
      'bottle': { symbol: '🍼', category: 'food' },
      'wine glass': { symbol: '🍷', category: 'food' },
      'cup': { symbol: '☕', category: 'food' },
      'fork': { symbol: '🍴', category: 'food' },
      'knife': { symbol: '🔪', category: 'food' },
      'spoon': { symbol: '🥄', category: 'food' },
      'bowl': { symbol: '🍜', category: 'food' },
      'microwave': { symbol: '🫕', category: 'appliance' },
      'oven': { symbol: '🔥', category: 'appliance' },
      'toaster': { symbol: '🍞', category: 'appliance' },
      'sink': { symbol: '🚿', category: 'appliance' },
      'refrigerator': { symbol: '🧊', category: 'appliance' },
      
      // Food
      'banana': { symbol: '🍌', category: 'food' },
      'apple': { symbol: '🍎', category: 'food' },
      'sandwich': { symbol: '🥪', category: 'food' },
      'orange': { symbol: '🍊', category: 'food' },
      'broccoli': { symbol: '🥦', category: 'food' },
      'carrot': { symbol: '🥕', category: 'food' },
      'hot dog': { symbol: '🌭', category: 'food' },
      'pizza': { symbol: '🍕', category: 'food' },
      'donut': { symbol: '🍩', category: 'food' },
      'cake': { symbol: '🎂', category: 'food' },
      
      // Objects
      'backpack': { symbol: '🎒', category: 'object' },
      'umbrella': { symbol: '☂️', category: 'object' },
      'handbag': { symbol: '👜', category: 'object' },
      'tie': { symbol: '👔', category: 'clothing' },
      'suitcase': { symbol: '🧳', category: 'object' },
      'book': { symbol: '📚', category: 'object' },
      'clock': { symbol: '🕐', category: 'object' },
      'vase': { symbol: '🏺', category: 'object' },
      'scissors': { symbol: '✂️', category: 'object' },
      'teddy bear': { symbol: '🧸', category: 'toy' },
      'toothbrush': { symbol: '🪥', category: 'object' },
      
      // Sports
      'frisbee': { symbol: '🥏', category: 'toy' },
      'skis': { symbol: '🎿', category: 'sports' },
      'snowboard': { symbol: '🏂', category: 'sports' },
      'sports ball': { symbol: '⚽', category: 'toy' },
      'kite': { symbol: '🪁', category: 'toy' },
      'baseball bat': { symbol: '🏏', category: 'sports' },
      'baseball glove': { symbol: '🥊', category: 'sports' },
      'skateboard': { symbol: '🛹', category: 'sports' },
      'surfboard': { symbol: '🏄', category: 'sports' },
      'tennis racket': { symbol: '🎾', category: 'sports' },
      
      // Default
      'unknown': { symbol: '❓', category: 'unknown' }
    };
    
    // Phrase templates organized by category and intent
    this.phraseTemplates = {
      // Universal templates (work for any object)
      universal: {
        request: [
          'I want the {object}',
          'Can I have the {object}?',
          '{object} please',
          'Give me the {object}'
        ],
        comment: [
          'I see a {object}',
          'Look at the {object}',
          'There\'s a {object}',
          'That\'s a {object}'
        ],
        question: [
          'What\'s the {object}?',
          'Where\'s the {object}?',
          'Is that a {object}?',
          'Can I see the {object}?'
        ]
      },
      
      // Category-specific templates
      people: {
        social: [
          'Hi {object}!',
          'I see {object}',
          'Where is {object}?',
          'I want {object}'
        ]
      },
      
      food: {
        request: [
          'I want to eat {object}',
          'I\'m hungry for {object}',
          'Can I have some {object}?',
          'I want more {object}'
        ],
        comment: [
          '{object} is yummy',
          'I like {object}',
          '{object} looks good',
          'No more {object}'
        ]
      },
      
      toy: {
        play: [
          'Let\'s play with the {object}',
          'I want to play {object}',
          'Can I have the {object}?',
          'My turn with the {object}'
        ],
        comment: [
          'Fun {object}!',
          'I like the {object}',
          'The {object} is mine',
          'Put away the {object}'
        ]
      },
      
      animal: {
        comment: [
          'Look at the {object}!',
          'I see a {object}',
          'Pet the {object}',
          'The {object} is cute'
        ],
        question: [
          'What does the {object} say?',
          'Where\'s the {object}?',
          'Is that a {object}?',
          'Can I pet the {object}?'
        ]
      },
      
      furniture: {
        action: [
          'Sit on the {object}',
          'I need the {object}',
          'Move the {object}',
          'Clean the {object}'
        ]
      },
      
      electronics: {
        request: [
          'Turn on the {object}',
          'I want the {object}',
          'Can I use the {object}?',
          'Turn off the {object}'
        ]
      }
    };
  }
  
  /**
   * Process detected objects into AAC vocabulary items
   */
  processDetections(detections, context = {}) {
    const vocabulary = detections.map(detection => {
      const vocabItem = this.createVocabularyItem(detection, context);
      return vocabItem;
    });
    
    // Sort by relevance/priority
    vocabulary.sort((a, b) => b.priority - a.priority);
    
    this.log('Generated vocabulary:', vocabulary);
    return vocabulary;
  }
  
  /**
   * Create a single vocabulary item from a detection
   */
  createVocabularyItem(detection, context) {
    const { class: objectClass, score } = detection;
    
    // Get symbol and category
    const symbolData = this.symbolMap[objectClass] || this.symbolMap['unknown'];
    const { symbol, category } = symbolData;
    
    // Generate phrases
    const phrases = this.generatePhrases(objectClass, category, context);
    
    // Calculate priority based on confidence and context
    const priority = this.calculatePriority(detection, category, context);
    
    return {
      id: `${objectClass}_${Date.now()}`,
      object: objectClass,
      symbol: symbol,
      category: category,
      phrases: phrases,
      confidence: score,
      priority: priority,
      timestamp: Date.now()
    };
  }
  
  /**
   * Generate contextually appropriate phrases
   */
  generatePhrases(objectClass, category, context) {
    const phrases = [];
    
    // Get templates for this category
    const categoryTemplates = this.phraseTemplates[category] || {};
    const universalTemplates = this.phraseTemplates.universal;
    
    // Combine category-specific and universal templates
    const allTemplates = { ...universalTemplates, ...categoryTemplates };
    
    // Generate phrases from templates
    Object.entries(allTemplates).forEach(([intent, templates]) => {
      // Pick 1-2 templates per intent
      const selectedTemplates = this.selectTemplates(templates, context);
      
      selectedTemplates.forEach(template => {
        const phrase = template.replace('{object}', objectClass);
        phrases.push({
          text: phrase,
          intent: intent,
          template: template
        });
      });
    });
    
    // Limit to configured maximum
    return phrases.slice(0, this.config.maxPhrasesPerObject);
  }
  
  /**
   * Select which templates to use based on context
   */
  selectTemplates(templates, context) {
    // For now, randomly select 1-2 templates
    // TODO: Use context to make smarter selections
    const count = Math.min(2, templates.length);
    const selected = [];
    const tempTemplates = [...templates];
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * tempTemplates.length);
      selected.push(tempTemplates.splice(index, 1)[0]);
    }
    
    return selected;
  }
  
  /**
   * Calculate priority for vocabulary item
   */
  calculatePriority(detection, category, context) {
    let priority = detection.score * 100; // Start with confidence
    
    // Boost certain categories based on context
    if (context.timeOfDay === 'morning' && category === 'food') {
      priority *= 1.5;
    }
    
    if (context.recentActivity === 'play' && category === 'toy') {
      priority *= 1.5;
    }
    
    // Boost based on object importance
    const importantObjects = ['person', 'food', 'drink'];
    if (importantObjects.some(obj => detection.class.includes(obj))) {
      priority *= 1.2;
    }
    
    return Math.round(priority);
  }
  
  /**
   * Get quick communication options
   */
  getQuickPhrases(detections) {
    // Return the top phrase from each detected object
    const vocabulary = this.processDetections(detections);
    
    return vocabulary.map(item => ({
      object: item.object,
      symbol: item.symbol,
      phrase: item.phrases[0] // Top phrase
    }));
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Add custom symbol mapping
   */
  addSymbolMapping(objectClass, symbol, category) {
    this.symbolMap[objectClass] = { symbol, category };
  }
  
  /**
   * Add custom phrase template
   */
  addPhraseTemplate(category, intent, template) {
    if (!this.phraseTemplates[category]) {
      this.phraseTemplates[category] = {};
    }
    if (!this.phraseTemplates[category][intent]) {
      this.phraseTemplates[category][intent] = [];
    }
    this.phraseTemplates[category][intent].push(template);
  }
  
  /**
   * Logging helper
   */
  log(...args) {
    if (this.config.debugMode) {
      console.log('[AACEngine]', ...args);
    }
  }
}

export default AACEngine;
