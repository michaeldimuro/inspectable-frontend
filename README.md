# Home Inspector Mobile App

A professional React Native mobile application for home inspectors built with Expo, featuring camera integration, AI-powered image analysis, and PDF report generation.

## 🚀 Features

- **User Authentication**: Secure login/register with JWT
- **Property Management**: Organize inspections by property
- **Area Organization**: Break properties into areas (crawlspace, basement, etc.)
- **Photo Capture**: Built-in camera with photo library support
- **AI Analysis**: Automatic image analysis using OpenAI Vision API
- **Inspection Items**: Track issues with photos and descriptions
- **PDF Reports**: Generate comprehensive inspection reports
- **Native Sharing**: Share reports via email, SMS, and more
- **Modern UI**: Beautiful interface with Tailwind CSS (NativeWind)

## 📋 Prerequisites

- Node.js (v14 or higher)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Backend API running (see backend README)

## 🛠️ Installation

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   - Edit `src/config/api.js`
   - For local development:
     ```javascript
     export const API_BASE_URL = 'http://localhost:3000/api';
     ```
   - For testing on physical device, use your computer's local IP:
     ```javascript
     export const API_BASE_URL = 'http://192.168.1.XXX:3000/api';
     ```

4. **Start the app:**
   ```bash
   # Start Expo development server
   npm start

   # Or run directly on iOS
   npm run ios

   # Or run on Android
   npm run android
   ```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── PropertyCard.js       # Property list item
│   │   ├── AreaCard.js           # Area list item
│   │   └── InspectionItemCard.js # Inspection item with AI results
│   ├── config/
│   │   └── api.js                # API configuration
│   ├── navigation/
│   │   └── AppNavigator.js       # Navigation structure
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── PropertyListScreen.js
│   │   ├── PropertyDetailScreen.js
│   │   ├── AreaDetailScreen.js
│   │   ├── CameraScreen.js
│   │   └── ProfileScreen.js
│   ├── services/
│   │   └── api.js                # API client with interceptors
│   └── stores/
│       ├── authStore.js          # Authentication state
│       └── propertyStore.js      # Property/area/item state
├── App.js                         # App entry point
├── app.json                       # Expo configuration
├── package.json
└── README.md
```

## 🎯 Usage Flow

1. **Register/Login**: Create an account or login
2. **Create Property**: Add a new property with name and address
3. **Add Areas**: Break property into areas (e.g., "Crawlspace", "Basement")
4. **Take Photos**: 
   - Navigate to an area
   - Tap camera button
   - Capture or select photo
   - Add description (e.g., "broken joist")
   - AI automatically analyzes the image
5. **View AI Analysis**: See detailed summaries, recommendations, and severity
6. **Generate Report**: 
   - From property detail screen
   - Tap "Generate Report"
   - Share via email, SMS, or other apps

## 🏗️ Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack + Tabs)
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Camera**: Expo Camera
- **Image Picker**: Expo Image Picker
- **Sharing**: Expo Sharing
- **Storage**: AsyncStorage
- **HTTP Client**: Axios

## 🔒 Security

- JWT tokens stored securely in AsyncStorage
- Automatic token refresh on app launch
- Token sent in Authorization header for all API calls
- Auto-logout on 401 responses

## 📱 Screens

### Authentication
- **Login**: Email/password authentication
- **Register**: New user registration

### Main App
- **Property List**: View all properties with area/item counts
- **Property Detail**: View areas, generate reports, manage property
- **Area Detail**: View inspection items with AI analysis
- **Camera**: Capture photos with description input
- **Profile**: User information and logout

## 🎨 Styling

The app uses NativeWind (Tailwind CSS) for styling:
- Consistent design system
- Responsive layouts
- Easy customization
- Clean, modern UI

Example:
```jsx
<View className="flex-1 bg-gray-50 p-4">
  <Text className="text-2xl font-bold text-blue-600">
    Home Inspector
  </Text>
</View>
```

## 📊 State Management

### Auth Store
- User authentication state
- JWT token management
- Login/register/logout actions

### Property Store
- Properties, areas, and items
- CRUD operations
- Loading and error states
- Automatic data refresh

## 📸 Camera Integration

- Native camera access
- Photo library support
- Image preview before upload
- Automatic upload and AI analysis

## 🤖 AI Features

- Automatic image analysis after photo upload
- Detailed technical summaries
- Repair recommendations
- Severity assessment (low/medium/high)
- Cost estimates
- Expandable/collapsible results

## 📄 PDF Report Features

- Property information header
- Organized by areas
- Embedded photos
- User descriptions
- AI analysis results
- Severity indicators
- Professional formatting
- One-tap sharing

## 🔧 Configuration

### API Endpoint
Edit `src/config/api.js` to point to your backend:
```javascript
export const API_BASE_URL = 'http://YOUR_IP:3000/api';
```

### Permissions
The app requests:
- Camera access
- Photo library access
- File system access (for PDF saving)

## 🚀 Building for Production

### iOS
```bash
# Build for iOS
expo build:ios

# Or use EAS Build
eas build --platform ios
```

### Android
```bash
# Build for Android
expo build:android

# Or use EAS Build
eas build --platform android
```

## 🐛 Troubleshooting

**Camera not working:**
- Check permissions in app settings
- Verify Expo Camera is installed
- Test on physical device (camera doesn't work in simulator)

**API connection errors:**
- Verify backend is running
- Check API_BASE_URL configuration
- For physical devices, use local IP not localhost
- Ensure devices are on same network

**Images not displaying:**
- Check backend upload directory permissions
- Verify BASE_URL in backend .env
- Ensure uploaded files are accessible

**Build errors:**
- Clear cache: `expo start -c`
- Remove node_modules: `rm -rf node_modules && npm install`
- Clear Metro bundler cache

## 📱 Testing on Devices

**iOS:**
1. Install Expo Go from App Store
2. Run `npm start`
3. Scan QR code with Camera app

**Android:**
1. Install Expo Go from Play Store
2. Run `npm start`
3. Scan QR code with Expo Go app

## 🎯 Future Enhancements

- Offline mode with local caching
- Voice-to-text for descriptions
- Multiple photo support per item
- Photo annotations/markup
- Custom report templates
- Team collaboration features
- Cloud sync

## 📝 License

ISC

## 👥 Support

For issues and questions, please open an issue on the project repository.


