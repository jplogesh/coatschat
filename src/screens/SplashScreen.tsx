import React from 'react';
import { View, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

export default function SplashScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <View className="flex-row items-center mb-4">
          <MessageCircle size={40} className="text-blue-600 mr-2" />
          <Text className="text-3xl font-bold text-gray-800">CoatsChat</Text>
        </View>
        <View className="mt-8">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    </SafeAreaView>
  );
}
