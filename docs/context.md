# FoodSec: Smart Food Waste Prevention App

## 🚀 Overview
FoodSec is a cross-platform mobile application built with React Native, designed to help users reduce food waste by intelligently tracking grocery items and their expiration dates. The app runs on both iOS and Android platforms, combining OCR technology, local LLM processing, and smart notifications to create a seamless food management experience.

## 🎯 Core Features

### 1. Smart Receipt Scanning
- **OCR Integration**: Extract text from grocery receipts using platform-specific OCR solutions
  - iOS: Vision framework integration
  - Android: ML Kit integration
- **AI-Powered Parsing**: Local LLM (HuggingFace) for intelligent item classification and data extraction
- **Manual Editing**: User-friendly interface for reviewing and correcting parsed items

### 2. Food Tracking
- **Expiration Management**: Automatic tracking of food items with estimated expiry dates
- **Status Indicators**: Color-coded system (green = fresh, yellow = soon, red = expired)
- **Detailed Item Cards**: Display name, date added, expiry date, quantity, category, and store information

### 3. Smart Notifications
- **Proactive Alerts**: Platform-specific push notifications for expiring items
  - iOS: Apple Push Notification Service (APNS)
  - Android: Firebase Cloud Messaging (FCM)
- **Customizable Settings**: User-defined notification preferences
- **Multi-level Warnings**: 3-day and day-of expiry notifications

## 📱 User Interface

### Navigation Structure
1. **Welcome Screen**
   - Clean, minimalist design following platform-specific guidelines
   - Email-based authentication with platform-specific biometric options

2. **Main Dashboard**
   - "Expiring Soon" items list with platform-optimized scrolling
   - Interactive item cards following Material Design (Android) and Human Interface Guidelines (iOS)
   - Quick actions for each item

3. **Bottom Navigation**
   - Home (Dashboard)
   - Scan (Camera)
   - All Items (Inventory)

4. **All Items View**
   - Comprehensive inventory list with platform-specific gestures
   - Advanced sorting and filtering
   - Bulk management options

## 🛠 Technical Architecture

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation with platform-specific transitions
- **State Management**: Context API / Redux
- **UI Components**: React Native Paper (Material Design) and custom iOS components

### Backend
- **Database**: MongoDB
- **Authentication**: Clerk with platform-specific biometric authentication
- **Data Sync**: Local-first with cloud backup
- **Push Notifications**: Platform-specific implementations (APNS/FCM)

### AI/ML Components
- **OCR**: Platform-specific implementations
  - iOS: Vision framework
  - Android: ML Kit
- **NLP**: HuggingFace Local LLM
- **Expiration Logic**: Predict via LLM and then save accordingly

## 📦 Data Model

### Complete Database Schema

```typescript
// User Schema
interface User {
  _id: ObjectId;
  email: string;
  password: string; // hashed
  createdAt: Date;
  updatedAt: Date;
  settings: {
    notificationPreferences: {
      expiringSoon: boolean; // 3 days before
      expired: boolean;      // day of expiry
      customReminders: boolean;
    };
    defaultCategories: string[];
  };
}

// Item Schema
interface Item {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  dateAdded: Date;
  estimatedExpiry: Date;
  status: 'fresh' | 'soon' | 'expired';
  quantity: number;
  category: string;
  store: string;
  receiptTotal: number;
  receiptId: ObjectId;
  notes?: string;
  imageUrl?: string;
  barcode?: string;
}

// Receipt Schema
interface Receipt {
  _id: ObjectId;
  userId: ObjectId;
  storeName: string;
  purchaseDate: Date;
  totalAmount: number;
  items: ObjectId[]; // References to Item documents
  imageUrl: string;
  rawText: string;   // OCR output
  parsedData: {
    items: {
      name: string;
      price: number;
      quantity: number;
    }[];
    taxes: number;
    discounts: number;
  };
}

// Notification Schema
interface Notification {
  _id: ObjectId;
  userId: ObjectId;
  itemId: ObjectId;
  type: 'expiringSoon' | 'expired' | 'custom';
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
  read: boolean;
}
```

## 📁 Project Structure

```
FoodSecApp/
├── app/                      # Main application code
│   ├── assets/              # Static assets (images, fonts)
│   │   ├── common/         # Shared components
│   │   ├── items/          # Item-related components
│   │   ├── receipts/       # Receipt-related components
│   │   └── notifications/  # Notification components
│   ├── screens/            # Screen components
│   │   ├── auth/          # Authentication screens
│   │   ├── home/          # Dashboard screens
│   │   ├── scan/          # Scanning screens
│   │   └── items/         # Item management screens
│   ├── navigation/         # Navigation configuration
│   ├── services/           # API and external services
│   │   ├── api/           # API clients
│   │   ├── ocr/           # OCR service
│   │   ├── ml/            # ML processing
│   │   └── notifications/ # Push notification service
│   ├── store/             # State management
│   │   ├── actions/       # Redux actions
│   │   ├── reducers/      # Redux reducers
│   │   └── selectors/     # Redux selectors
│   ├── utils/             # Utility functions
│   │   ├── date/          # Date handling
│   │   ├── validation/    # Input validation
│   │   └── helpers/       # Helper functions
│   └── hooks/             # Custom React hooks
├── config/                 # Configuration files
│   ├── env/               # Environment variables
│   └── constants/         # App constants
├── tests/                  # Test files
│   ├── components/        # Component tests
│   ├── screens/           # Screen tests
│   └── utils/             # Utility tests
├── docs/                   # Documentation
├── .gitignore             # Git ignore file
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

### Key Directories Explained

1. **app/components/**
   - Organized by feature and type
   - Common components shared across features
   - Feature-specific components grouped by domain

2. **app/screens/**
   - Each feature has its own directory
   - Screens are organized by user flow
   - Related screens grouped together

3. **app/services/**
   - External service integrations
   - API clients and data fetching
   - ML and OCR processing

4. **app/store/**
   - Redux store configuration
   - Action creators and reducers
   - State selectors

5. **app/utils/**
   - Helper functions and utilities
   - Date formatting and calculations
   - Input validation

6. **config/**
   - Environment-specific configurations
   - App-wide constants
   - API endpoints and keys

## 🔮 Future Enhancements
- Barcode scanning integration
- Recipe suggestions based on expiring items
- AI-powered meal planning
- Family sharing features
- Gamification elements

## 💡 Development Guidelines
- Prioritize scanning accuracy and speed
- Focus on intuitive user experience
- Implement local-first storage strategy
- Maintain clean, stress-free UI design

## 🎨 Branding
- **Tagline**: "Snap. Track. Never Waste."
- **Mission**: Reduce food waste through intelligent tracking
- **Tone**: Helpful, proactive, and eco-conscious

## 🛣 Development Roadmap

### Phase 1: Project Setup & Authentication (Week 1)
1. **Initial Setup**
   - Initialize React Native project with Expo
   - Set up TypeScript configuration
   - Configure ESLint and Prettier
   - Set up Git repository

2. **Authentication System**
   - Implement email/password authentication
   - Create user registration flow
   - Set up MongoDB connection
   - Implement JWT token handling
   - Create protected routes

### Phase 2: Core UI & Navigation (Week 2)
1. **Basic UI Components**
   - Create reusable UI components
   - Implement theme system
   - Set up navigation structure
   - Create bottom tab navigation

2. **Screens Implementation**
   - Welcome/Login screen
   - Dashboard layout
   - Items list view
   - Basic settings screen

### Phase 3: Camera & OCR Integration (Week 3)
1. **Camera Implementation**
   - Set up camera permissions
   - Implement camera screen
   - Add image capture functionality
   - Create image preview

2. **OCR Integration**
   - Integrate Tesseract.js
   - Implement text extraction
   - Create receipt parsing logic
   - Add manual editing interface

### Phase 4: Item Management (Week 4)
1. **Item CRUD Operations**
   - Create item data model
   - Implement item creation flow
   - Add item editing functionality
   - Create item deletion

2. **Item Organization**
   - Implement category system
   - Add sorting functionality
   - Create filtering options
   - Implement search feature

### Phase 5: Expiration Tracking (Week 5)
1. **Expiration Logic**
   - Implement expiration date calculation
   - Create status indicators
   - Add expiration warnings
   - Implement status updates

2. **Notification System**
   - Set up push notifications
   - Implement notification scheduling
   - Create notification preferences
   - Add notification history

### Phase 6: Data Sync & Storage (Week 6)
1. **Local Storage**
   - Implement AsyncStorage
   - Create data persistence
   - Add offline support
   - Implement data caching

2. **Cloud Sync**
   - Set up MongoDB Atlas
   - Implement data synchronization
   - Add conflict resolution
   - Create backup system

### Phase 7: Testing & Optimization (Week 7)
1. **Testing**
   - Write unit tests
   - Implement integration tests
   - Add E2E tests
   - Perform security testing

2. **Performance Optimization**
   - Optimize image processing
   - Improve OCR performance
   - Enhance app responsiveness
   - Reduce battery consumption

### Phase 8: Polish & Launch (Week 8)
1. **UI/UX Refinement**
   - Implement animations
   - Add loading states
   - Improve error handling
   - Enhance accessibility

2. **Launch Preparation**
   - Create app store assets
   - Write app descriptions
   - Prepare marketing materials
   - Set up analytics

## 📅 Weekly Milestones

### Week 1 Deliverables
- [ ] Project setup complete
- [ ] Authentication system working
- [ ] Basic navigation structure
- [ ] MongoDB connection established

### Week 2 Deliverables
- [ ] Core UI components ready
- [ ] Navigation system complete
- [ ] Basic screens implemented
- [ ] Theme system in place

### Week 3 Deliverables
- [ ] Camera functionality working
- [ ] OCR integration complete
- [ ] Receipt parsing working
- [ ] Manual editing interface ready

### Week 4 Deliverables
- [ ] Item management system complete
- [ ] Category system implemented
- [ ] Sorting and filtering working
- [ ] Search functionality ready

### Week 5 Deliverables
- [ ] Expiration tracking working
- [ ] Status indicators implemented
- [ ] Notification system ready
- [ ] Warning system complete

### Week 6 Deliverables
- [ ] Local storage implemented
- [ ] Cloud sync working
- [ ] Offline support ready
- [ ] Backup system in place

### Week 7 Deliverables
- [ ] Test suite complete
- [ ] Performance optimizations done
- [ ] Security testing passed
- [ ] Battery optimization complete

### Week 8 Deliverables
- [ ] UI/UX refinements complete
- [ ] App store assets ready
- [ ] Marketing materials prepared
- [ ] Analytics system in place

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/foodsec.git
   cd foodsec
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Run on device/emulator**
   ```bash
   # For iOS (requires macOS)
   npm run ios
   
   # For Android
   npm run android
   ```

6. **Platform-Specific Setup**
   - **iOS**:
     - Install Xcode
     - Configure Apple Developer account
     - Set up APNS certificates
   
   - **Android**:
     - Install Android Studio
     - Configure Firebase project
     - Set up FCM credentials

---

*Note: This documentation is subject to updates as the project evolves.*
