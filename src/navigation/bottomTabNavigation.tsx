import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import UsersListScreen from '../screens/UsersListScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Users, Settings } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigation() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Users') {
            return <Users size={size} color={color} />;
          } else if (route.name === 'Settings') {
            return <Settings size={size} color={color} />;
          }
          return null;
        },
        tabBarActiveTintColor: '#0B75FF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Users" component={UsersListScreen}  options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen}  options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
