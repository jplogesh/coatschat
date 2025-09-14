// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthScreen from '../screens/AuthScreen';
import BottomTabNavigation from './bottomTabNavigation';
import ChatScreen from '../screens/ChatScreen';
import SplashScreen from '../screens/SplashScreen';
import { useAuth } from '../contexts/AuthContext';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { chatId: string; otherUser: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="Main" component={BottomTabNavigation} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{headerShown:false}}/>
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
