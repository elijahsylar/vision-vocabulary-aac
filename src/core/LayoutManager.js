/**
 * LayoutManager.js
 * Intelligent layout system for AAC button placement
 * Optimizes for motor memory, frequency, and accessibility
 */

class LayoutManager {
  constructor(config = {}) {
    this.config = {
      gridColumns: config.gridColumns || 6,
      gridRows: config.gridRows || 4,
      coreWordsZone: config.coreWordsZone || { rows: 2, position: 'top' },
      preserveMotorMemory: config.preserveMotorMemory !== false,
      animateChanges: config.animateChanges !== false,
      debugMode: config.debugMode || false
    };
    
    // Layout state
    this.gridState = this.initializeGrid();
    this.positionHistory = new Map(); // Remember where words have been
    this.usageStats = new Map(); // Track frequency of use
    this.lastLayoutTime = Date.now();
    
    this.zones = this.computeZones();
  }

  /**
   * Zones for different types of words, derived from the grid size so every
   * zone has rows to place into: core rows on top, then one row of frequent
   * words, and the remaining rows shared by contextual and newly seen words.
   * Recomputed whenever the grid size changes.
   */
  computeZones() {
    const rows = this.config.gridRows;
    const coreRows = Math.max(1, Math.min(this.config.coreWordsZone.rows, rows - 1));
    const lastRow = rows - 1;
    const afterCore = Math.min(coreRows, lastRow);
    const lower = Math.min(afterCore + 1, lastRow);
    return {
      core: { startRow: 0, endRow: coreRows - 1, priority: 10 }, // High-frequency core words
      frequent: { startRow: afterCore, endRow: afterCore, priority: 8 }, // User's frequent words
      contextual: { startRow: lower, endRow: lastRow, priority: 6 }, // Context-specific
      new: { startRow: lower, endRow: lastRow, priority: 4 } // Recently detected
    };
  }
  
  /**
   * Initialize empty grid
   */
  initializeGrid() {
    const grid = [];
    for (let row = 0; row < this.config.gridRows; row++) {
      grid[row] = [];
      for (let col = 0; col < this.config.gridColumns; col++) {
        grid[row][col] = null;
      }
    }
    return grid;
  }
  
  /**
   * Main layout method - arranges vocabulary items optimally
   */
  layoutVocabulary(vocabularyItems, context = {}) {
    const startTime = Date.now();
    
    // Separate items by type
    const categorized = this.categorizeItems(vocabularyItems, context);
    
    // Clear grid but remember positions
    this.saveCurrentPositions();
    this.gridState = this.initializeGrid();
    
    // Place items by priority
    const layoutResult = {
      positions: new Map(),
      grid: this.gridState,
      changes: []
    };
    
    // 1. Place core words (always same position)
    this.placeItemsInZone(categorized.core, this.zones.core, layoutResult, true);
    
    // 2. Place frequent words (try to maintain position)
    this.placeItemsInZone(categorized.frequent, this.zones.frequent, layoutResult, true);
    
    // 3. Place contextual words
    this.placeItemsInZone(categorized.contextual, this.zones.contextual, layoutResult, false);
    
    // 4. Place new/remaining words
    this.placeItemsInZone(categorized.new, this.zones.new, layoutResult, false);
    
    // 5. Optimize layout
    this.optimizeLayout(layoutResult);
    
    this.lastLayoutTime = Date.now();
    this.log(`Layout completed in ${Date.now() - startTime}ms`);
    
    return layoutResult;
  }
  
  /**
   * Categorize vocabulary items by type and priority
   */
  categorizeItems(items, context) {
    const categories = {
      core: [],
      frequent: [],
      contextual: [],
      new: []
    };
    
    items.forEach(item => {
      // Get usage frequency
      const usage = this.usageStats.get(item.word) || 0;
      
      // Core words (always available)
      if (item.isCore || usage > 50) {
        categories.core.push({ ...item, usage });
      }
      // Frequently used words
      else if (usage > 10) {
        categories.frequent.push({ ...item, usage });
      }
      // Context-relevant words
      else if (this.isContextRelevant(item, context)) {
        categories.contextual.push({ ...item, usage });
      }
      // Everything else is "new"
      else {
        categories.new.push({ ...item, usage });
      }
    });
    
    // Sort each category by usage/priority
    Object.keys(categories).forEach(key => {
      categories[key].sort((a, b) => {
        // First by usage frequency
        if (b.usage !== a.usage) return b.usage - a.usage;
        // Then by confidence if available
        if (b.confidence && a.confidence) return b.confidence - a.confidence;
        // Then by recency
        return (b.lastUsed || 0) - (a.lastUsed || 0);
      });
    });
    
    return categories;
  }
  
  /**
   * Check if item is relevant to current context
   */
  isContextRelevant(item, context) {
    if (!context.location) return false;
    
    const contextMap = {
      kitchen: ['eat', 'drink', 'hungry', 'food', 'cup', 'spoon', 'bowl'],
      bedroom: ['sleep', 'tired', 'bed', 'pillow', 'blanket', 'dream'],
      bathroom: ['toilet', 'wash', 'brush', 'clean', 'bath'],
      outside: ['go', 'play', 'run', 'ball', 'swing', 'slide']
    };
    
    const relevantWords = contextMap[context.location] || [];
    return relevantWords.includes(item.word);
  }
  
  /**
   * Place items within a specific zone
   */
  placeItemsInZone(items, zone, layoutResult, preservePosition) {
    let placed = 0;
    
    for (const item of items) {
      let position = null;
      
      // Try to preserve previous position if requested
      if (preservePosition && this.positionHistory.has(item.word)) {
        const previousPos = this.positionHistory.get(item.word);
        if (this.isPositionAvailable(previousPos) && 
            this.isInZone(previousPos, zone)) {
          position = previousPos;
        }
      }
      
      // Find new position if needed
      if (!position) {
        position = this.findBestPosition(item, zone);
      }
      
      // Place item if position found
      if (position) {
        this.placeItem(item, position, layoutResult);
        placed++;
      }
    }
    
    this.log(`Placed ${placed}/${items.length} items in zone ${JSON.stringify(zone)}`);
  }
  
  /**
   * Find best available position for an item
   */
  findBestPosition(item, zone) {
    let bestPosition = null;
    let bestScore = -1;
    
    for (let row = zone.startRow; row <= zone.endRow && row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridColumns; col++) {
        if (this.gridState[row][col] === null) {
          const score = this.scorePosition(item, { row, col }, zone);
          if (score > bestScore) {
            bestScore = score;
            bestPosition = { row, col };
          }
        }
      }
    }
    
    return bestPosition;
  }
  
  /**
   * Score a potential position for an item
   */
  scorePosition(item, position, zone) {
    let score = 100;
    
    // Prefer positions based on handedness (configurable)
    const centerCol = Math.floor(this.config.gridColumns / 2);
    const colDistance = Math.abs(position.col - centerCol);
    score -= colDistance * 5;
    
    // Prefer upper rows within zone (easier to reach)
    const rowInZone = position.row - zone.startRow;
    score -= rowInZone * 10;
    
    // Bonus for edge positions (easier to find)
    if (position.col === 0 || position.col === this.config.gridColumns - 1) {
      score += 10;
    }
    
    // Consider Fitts's Law - frequently used items should be larger/easier to hit
    const usage = this.usageStats.get(item.word) || 0;
    score += Math.min(usage, 20); // Cap bonus at 20
    
    return score;
  }
  
  /**
   * Check if position is available
   */
  isPositionAvailable(position) {
    return position.row < this.config.gridRows && 
           position.col < this.config.gridColumns &&
           this.gridState[position.row][position.col] === null;
  }
  
  /**
   * Check if position is within zone
   */
  isInZone(position, zone) {
    return position.row >= zone.startRow && position.row <= zone.endRow;
  }
  
  /**
   * Place item at position
   */
  placeItem(item, position, layoutResult) {
    this.gridState[position.row][position.col] = item.word;
    layoutResult.positions.set(item.word, position);
    
    // Track changes for animation (read the old position before overwriting it)
    const previousPos = this.positionHistory.get(item.word);
    this.positionHistory.set(item.word, position);
    if (previousPos && (previousPos.row !== position.row || previousPos.col !== position.col)) {
      layoutResult.changes.push({
        word: item.word,
        from: previousPos,
        to: position
      });
    }
  }
  
  /**
   * Save current grid positions before re-layout
   */
  saveCurrentPositions() {
    for (let row = 0; row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridColumns; col++) {
        const word = this.gridState[row][col];
        if (word) {
          this.positionHistory.set(word, { row, col });
        }
      }
    }
  }
  
  /**
   * Optimize layout for better grouping and access
   */
  optimizeLayout(layoutResult) {
    // Group related items together
    this.groupRelatedItems(layoutResult);
    
    // Ensure high-frequency items are easily accessible
    this.optimizeFrequentItems(layoutResult);
    
    // Fill gaps if possible
    this.compactLayout(layoutResult);
  }
  
  /**
   * Group semantically related items
   */
  groupRelatedItems(layoutResult) {
    const groups = {
      food: ['eat', 'drink', 'hungry', 'food', 'yummy', 'more'],
      movement: ['go', 'stop', 'run', 'walk', 'come', 'stay'],
      feelings: ['happy', 'sad', 'tired', 'hurt', 'scared', 'love']
    };
    
    // Implementation would swap positions to group related words
    // This is simplified for demonstration
  }
  
  /**
   * Ensure frequent items are optimally placed
   */
  optimizeFrequentItems(layoutResult) {
    // Move very frequent items to better positions if available
    const frequentThreshold = 20;
    
    layoutResult.positions.forEach((position, word) => {
      const usage = this.usageStats.get(word) || 0;
      if (usage > frequentThreshold) {
        // Check if better position available in frequent zone
        const betterPos = this.findBestPosition(
          { word, usage }, 
          this.zones.frequent
        );
        if (betterPos && this.scorePosition({ word }, betterPos, this.zones.frequent) > 
            this.scorePosition({ word }, position, this.zones.frequent)) {
          // Would implement swap logic here
        }
      }
    });
  }
  
  /**
   * Compact layout to remove gaps
   */
  compactLayout(layoutResult) {
    // Simplified - would implement algorithm to reduce empty spaces
    // while maintaining zones and motor memory
  }
  
  /**
   * Update usage statistics when word is selected
   */
  trackUsage(word) {
    const current = this.usageStats.get(word) || 0;
    this.usageStats.set(word, current + 1);
    
    // Also track timestamp for recency
    const now = Date.now();
    this.usageStats.set(`${word}_lastUsed`, now);
  }
  
  /**
   * Get layout metrics for optimization
   */
  getLayoutMetrics() {
    let filled = 0;
    let empty = 0;
    
    for (let row = 0; row < this.config.gridRows; row++) {
      for (let col = 0; col < this.config.gridColumns; col++) {
        if (this.gridState[row][col]) filled++;
        else empty++;
      }
    }
    
    return {
      filled,
      empty,
      fillRate: filled / (filled + empty),
      totalPositions: this.config.gridRows * this.config.gridColumns,
      usageStats: Object.fromEntries(this.usageStats)
    };
  }
  
  /**
   * Convert grid position to pixel coordinates
   */
  positionToPixels(position, containerSize) {
    const cellWidth = containerSize.width / this.config.gridColumns;
    const cellHeight = containerSize.height / this.config.gridRows;
    
    return {
      x: position.col * cellWidth,
      y: position.row * cellHeight,
      width: cellWidth,
      height: cellHeight
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Rebuild the grid and the zones if the size or the core zone changed
    if (newConfig.gridColumns || newConfig.gridRows || newConfig.coreWordsZone) {
      this.gridState = this.initializeGrid();
      this.zones = this.computeZones();
    }
  }
  
  /**
   * Clear all layout data
   */
  reset() {
    this.gridState = this.initializeGrid();
    this.positionHistory.clear();
    this.usageStats.clear();
  }
  
  /**
   * Export layout data for persistence
   */
  exportData() {
    return {
      config: this.config,
      positionHistory: Array.from(this.positionHistory.entries()),
      usageStats: Array.from(this.usageStats.entries()),
      lastLayoutTime: this.lastLayoutTime
    };
  }
  
  /**
   * Import saved layout data
   */
  importData(data) {
    if (data.config) {
      this.config = { ...this.config, ...data.config };
      // The saved grid may have another size: rebuild to match the config
      this.gridState = this.initializeGrid();
      this.zones = this.computeZones();
    }
    if (data.positionHistory) this.positionHistory = new Map(data.positionHistory);
    if (data.usageStats) this.usageStats = new Map(data.usageStats);
    if (data.lastLayoutTime) this.lastLayoutTime = data.lastLayoutTime;
  }
  
  /**
   * Logging helper
   */
  log(...args) {
    if (this.config.debugMode) {
      console.log('[LayoutManager]', ...args);
    }
  }
}

export default LayoutManager;
