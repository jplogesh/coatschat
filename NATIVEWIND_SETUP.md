# NativeWind Integration

This project has been successfully integrated with NativeWind v4 for Tailwind CSS styling in React Native.

## What's Been Done

### 1. Dependencies Installed

- `nativewind@4.2.0` - NativeWind v4 for React Native (latest stable)
- `tailwindcss@3.4.17` - Tailwind CSS v3 (compatible with NativeWind)
- `tailwind-merge@3.3.1` - Utility for merging Tailwind classes
- `react-native-reanimated@4.1.0` - Required for NativeWind v4
- `react-native-worklets@0.5.1` - Required for Reanimated
- `react-native-svg-transformer@1.5.1` - SVG transformer for Metro
- `lucide-react-native@0.544.0` - Lucide icons for React Native
- `react-native-svg@15.13.0` - SVG support for icons

### 2. Configuration Files

- **babel.config.js** - NativeWind v4 Babel preset and Reanimated plugin
- **metro.config.js** - Metro configuration with NativeWind v4 and SVG transformer
- **tailwind.config.js** - Tailwind configuration with NativeWind preset
- **global.css** - Global CSS file with Tailwind directives
- **nativewind-env.d.ts** - TypeScript declarations for NativeWind

### 3. App Integration

- **App.tsx** - Added global CSS import
- **tsconfig.json** - Updated to include NativeWind type declarations

### 4. Screen Conversions

All screens have been converted to use NativeWind classes:

#### AuthScreen

- Modern login/signup form with toggle
- Beautiful input fields with icons
- Responsive design with proper spacing
- Clean button styling

#### ChatScreen

- WhatsApp-style message bubbles
- Modern header with back button
- Clean input area with send button
- Proper message alignment and styling

#### UsersListScreen

- Search functionality with modern input
- User cards with avatars and status indicators
- Empty states with helpful messaging
- Clean list design

## Configuration Details

### Babel Configuration (babel.config.js)

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: ['react-native-reanimated/plugin'],
};
```

### Metro Configuration (metro.config.js)

```javascript
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withNativeWind} = require('nativewind/metro');

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts, sourceExts} = defaultConfig.resolver;

const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg'],
  },
};

const mergedConfig = mergeConfig(defaultConfig, config);
module.exports = withNativeWind(mergedConfig, {input: './global.css'});
```

### Tailwind Configuration (tailwind.config.js)

```javascript
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {extend: {}},
  plugins: [],
};
```

## Usage

### Basic Styling

Use Tailwind classes directly in your components:

```jsx
<View className="flex-1 bg-gray-50 p-4">
  <Text className="text-xl font-bold text-gray-900">Hello World</Text>
  <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg">
    <Text className="text-white font-semibold">Click me</Text>
  </TouchableOpacity>
</View>
```

### Icons

Use Lucide React Native icons:

```jsx
import {Search, User, MessageCircle} from 'lucide-react-native';

<Search className="w-5 h-5 text-gray-400" />;
```

### Responsive Design

NativeWind supports responsive design:

```jsx
<View className="w-full md:w-1/2 lg:w-1/3">
  <Text className="text-sm md:text-base lg:text-lg">Responsive text</Text>
</View>
```

## Development

### Running the App

```bash
# Start Metro bundler
yarn start

# Run on Android
yarn android

# Run on iOS
yarn ios
```

### Hot Reload

NativeWind supports hot reload for styling changes. Just save your files and the changes will be reflected immediately.

## Notes

- All styling is done through Tailwind classes
- No StyleSheet objects needed
- Icons are from Lucide React Native
- TypeScript support is included
- The design follows modern mobile UI patterns
