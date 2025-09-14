// App.tsx (top)
import 'react-native-gesture-handler'; // top-most import if index doesn't have it
import './global.css';
import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {enableScreens} from 'react-native-screens';
import { createNavigationContainerRef } from '@react-navigation/native';
import {AuthProvider} from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { messaging } from './firebase';


enableScreens(); // optional performance improvement

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
