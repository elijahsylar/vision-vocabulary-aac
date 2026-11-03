# VisionVocabularyAAC Technical Architecture

> Design document. It describes the intended architecture; the prototype in this repository implements object detection, the emoji symbol map, core words, phrase templates and the grid layout. Context, learning and symbol-set integration are not built.

## Core Concept
Transform real-time visual input into contextually appropriate AAC vocabulary without manual configuration.

---

## System Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Camera Input   │────▶│  Vision System   │────▶│   AAC Engine    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                 │                         │
                                 ▼                         ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Context Engine   │     │ Layout Manager  │
                        └──────────────────┘     └─────────────────┘
                                 │                         │
                                 └──────────┬──────────────┘
                                            ▼
                                    ┌─────────────────┐
                                    │   UI Renderer   │
                                    └─────────────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │ Learning System │
                                    └─────────────────┘
```

---

## Core Modules

### 1. Vision System (`src/core/VisionSystem.js`)

**Purpose**: Extract meaningful objects from camera feed

**Key Components**:
```javascript
class VisionSystem {
  - objectDetector: TensorFlow.js COCO-SSD model
  - confidenceThreshold: 0.6 (adjustable)
  - deduplication: Prevent multiple detections of same object
  - frameSkipping: Process every Nth frame for performance
}
```

**Technical Decisions**:
- **COCO-SSD**: Pre-trained, runs in browser, 90 object classes
- **WebGL acceleration**: GPU processing for real-time performance
- **Adaptive processing**: Reduce frame rate on older devices

**Output**: Array of detected objects with confidence scores and bounding boxes

---

### 2. AAC Engine (`src/core/AACEngine.js`)

**Purpose**: Transform detected objects into communication options

**Key Components**:
```javascript
class AACEngine {
  - symbolMapper: Object → Symbol/Icon mapping
  - phraseGenerator: Context-aware phrase creation
  - vocabularyRanker: Importance scoring for objects
  - communicationIntentPredictor: What might user want to say?
}
```

**Symbol Mapping Strategy**:
1. **Primary**: SymbolStix integration (professional AAC symbols)
2. **Fallback**: High-quality emoji mapping
3. **Future**: AI-generated custom symbols

**Phrase Generation Algorithm**:
```
For each object:
  1. Identify object category (food/toy/furniture/person/etc)
  2. Apply category-specific templates
  3. Generate variations based on:
     - Time of day
     - Previous selections
     - Common patterns
  4. Rank by likelihood of use
```

**Example Output**:
```javascript
{
  object: "apple",
  symbol: "🍎",
  phrases: [
    { text: "I want the apple", intent: "request", priority: 1 },
    { text: "The apple looks good", intent: "comment", priority: 2 },
    { text: "Red apple", intent: "describe", priority: 3 }
  ]
}
```

---

### 3. Layout Manager (`src/core/LayoutManager.js`)

**Purpose**: Intelligent placement of AAC buttons for optimal access

**Core Algorithm**:
```
1. Grid Allocation (adaptive based on object count)
2. Priority Placement:
   - High-frequency items → Prime positions (center, top)
   - Motor memory preservation → Consistent locations
   - Related items → Spatial grouping
3. Fitts's Law optimization → Larger buttons for frequent items
4. Visual hierarchy → Size/color based on importance
```

**Layout Rules**:
- Core vocabulary always in consistent positions
- New items added to periphery first
- Frequently selected items migrate to better positions
- Never more than 12 items on screen (cognitive load)

**Accessibility Considerations**:
- Minimum button size: 44x44px (WCAG)
- High contrast borders
- Visual feedback on selection
- Switch scanning compatibility

---

### 4. Context Engine (`src/core/ContextEngine.js`)

**Purpose**: Understand environment and situation

**Context Signals**:
```javascript
{
  timeContext: {
    timeOfDay: "morning|afternoon|evening|night",
    mealtime: boolean,
    typical_activity: "play|meal|bedtime|school"
  },
  environmentContext: {
    location: inferredFromObjects(), // "kitchen", "bedroom", "classroom"
    socialContext: peoplePresent(), // alone, withFamily, group
    activityLevel: motionDetected() // calm, active
  },
  historicalContext: {
    recentSelections: last5Minutes(),
    commonPatterns: timeBasedPatterns(),
    conversationTopic: currentFocus()
  }
}
```

**Context-Driven Adaptations**:
- Kitchen + morning = breakfast vocabulary
- Bedroom + evening = bedtime routines
- Multiple people detected = social phrases
- Playground equipment = play vocabulary

---

### 5. Learning System (`src/core/LearningSystem.js`)

**Purpose**: Personalize system to individual user

**Learning Mechanisms**:
1. **Usage Tracking**:
   - Selection frequency
   - Time-to-selection
   - Error corrections
   - Phrase completions

2. **Pattern Recognition**:
   - Common word sequences
   - Context-specific preferences
   - Individual communication style
   - Motor patterns

3. **Predictive Modeling**:
   ```javascript
   nextLikelySelection = model.predict({
     currentContext,
     recentSelections,
     timeOfDay,
     historicalPatterns
   })
   ```

**Privacy-First Design**:
- All learning happens on-device
- No external data transmission
- User-controlled data reset
- Exportable for therapy tracking

---

## Data Flow

### Real-Time Pipeline
```
1. Camera captures frame (30fps)
   ↓
2. Vision System processes (every 3rd frame = 10fps)
   ↓
3. Object detection + confidence filtering
   ↓
4. Context Engine analyzes environment
   ↓
5. AAC Engine generates vocabulary options
   ↓
6. Layout Manager arranges interface
   ↓
7. UI renders interactive buttons
   ↓
8. User selection triggers:
   - Speech output
   - Learning system update
   - Context state update
```

### Performance Targets
- **Detection → Display**: <200ms
- **Selection → Speech**: <50ms
- **Memory usage**: <200MB
- **Battery impact**: <10% over baseline

---

## Technical Stack Details

### Frontend
- **React**: Component architecture, state management
- **Canvas API**: Custom rendering for performance
- **Web Speech API**: Text-to-speech output
- **Service Workers**: Offline functionality

### AI/ML
- **TensorFlow.js**: Client-side inference
- **COCO-SSD**: Object detection model
- **Custom models**: Context understanding (future)

### Storage
- **IndexedDB**: User data, patterns, settings
- **LocalStorage**: Quick access cache
- **File System API**: Image/symbol storage

---

## Key Algorithms

### 1. Object Deduplication
```javascript
function deduplicateObjects(detections) {
  // Group by class and proximity
  // Keep highest confidence per group
  // Merge overlapping bounding boxes
}
```

### 2. Smart Layout Generation
```javascript
function generateLayout(objects, history, screenSize) {
  // Calculate grid dimensions
  // Score each position for each object
  // Optimize global arrangement
  // Maintain motor memory constraints
}
```

### 3. Phrase Ranking
```javascript
function rankPhrases(object, context, userHistory) {
  // Score by context relevance
  // Boost by historical usage
  // Adjust for recent selections
  // Return top 3 options
}
```

---

## Future Architecture Considerations

### Scalability
- Plugin architecture for new object detectors
- Custom symbol set integration
- Multi-language support framework
- Cloud sync option (with encryption)

### Advanced Features
- Gaze tracking integration
- Gesture recognition
- Predictive full sentences
- Conversation maintenance
- Partner-assisted scanning

### Clinical Integration
- FHIR compliance for health records
- Therapy goal tracking
- Progress analytics
- SLP dashboard API

---

## Security & Privacy

### Data Protection
- All processing on-device by default
- Encryption at rest for user data
- No telemetry without consent
- Camera access indicators

### Child Safety
- No internet connectivity required
- No user-generated content sharing
- Parental controls for settings
- Session isolation

---

## Development Principles

1. **Performance First**: Must work on 3-year-old iPads
2. **Privacy Always**: No data leaves device without explicit consent
3. **Accessibility Core**: Every feature must be switch-accessible
4. **Clinical Validity**: Align with evidence-based AAC practices
5. **User Dignity**: Age-appropriate, respectful interface

---

## Testing Strategy

### Unit Tests
- Each module independently testable
- Mock camera inputs for vision system
- Deterministic phrase generation

### Integration Tests  
- Full pipeline performance
- Context switching accuracy
- Learning system convergence

---

*This architecture is designed to be both ambitious and achievable, providing a clear technical roadmap while maintaining flexibility for user-driven iterations.*
