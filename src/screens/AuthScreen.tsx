// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { User, Mail, Lock, MessageCircle, LocateIcon } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../utils/toast';

type Props = { navigation?: any };

const AuthScreen: React.FC<Props> = ({ navigation: _navigation }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { signUp, signIn } = useAuth();

  function isValidEmail(e: string) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(e);
  }

  async function handleSignUp() {
    if (!email || !pass) {
      showToast('Email and password are required.');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address.');
      return;
    }
    if(!location){
      showToast('Location is required.');
      return;
    }
    try {
      await signUp(email, pass, name, location);
    } catch (e: any) {
      showToast( e.message);
    }
  }

  async function handleLogin() {
    if (!email || !pass) {
      showToast('Email and password are required.');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email address.');
      return;
    }
    try {
      await signIn(email, pass);
 } catch (e: any) {
  console.log({ e });

  // If error comes inside an array, grab the first element
  const error = Array.isArray(e) ? e[0] : e;

  if (error?.code === 'auth/invalid-credential') {
    showToast('Invalid Credentials, Please try with valid one');
  } else {
    showToast(error?.message ?? 'Something went wrong');
  }
}

  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          {/* Top spacing so header sits more centered vertically */}
          <View className="flex-1 justify-center">
            {/* Header: illustration + title */}
            <View className="items-center mb-8">
              {/* optional illustration (remove or replace if you don't have asset) */}
              {/* <Image source={require('../assets/hero-small.png')} style={{width:96,height:96,marginBottom:12}} /> */}
          <View className='flex-row gap-2'>
   <MessageCircle size={30} className="text-blue-600 mr-2" />
             
              <Text className="text-2xl font-extrabold text-[#0B2C4A]">CoatsChat</Text>
            
          </View>
         <Text className="text-sm text-gray-500 mt-2">Sign in to continue</Text>
            </View>

            {/* Form Card */}
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              {/* Email */}
              <View className="mb-4">
                <Text className="text-sm text-gray-700 mb-2">Email</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg">
                  <View className="px-3">
                    <Mail width={18} height={18} color="#9AA3B2" />
                  </View>
                  <TextInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 py-3 text-gray-900"
                    placeholderTextColor="#9AA3B2"
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-4">
          

                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg mt-2">
                  <View className="px-3">
                    <Lock width={18} height={18} color="#9AA3B2" />
                  </View>
                  <TextInput
                    placeholder="Enter your password"
                    value={pass}
                    onChangeText={setPass}
                    secureTextEntry
                    className="flex-1 py-3 text-gray-900"
                    placeholderTextColor="#9AA3B2"
                  />
                  {/* optional visibility toggle icon space */}
                  <View className="px-3">
                    {/* empty for now or add eye icon */}
                  </View>
                </View>
              </View>

              {/* When signing up, show Name input above buttons */}
              {!isLogin && (
                <View className="mb-4">
                  <Text className="text-sm text-gray-700 mb-2">Name</Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg">
                    <View className="px-3">
                      <User width={18} height={18} color="#9AA3B2" />
                    </View>
                    <TextInput
                      placeholder="Full name"
                      value={name}
                      onChangeText={setName}
                      className="flex-1 py-3 text-gray-900"
                      placeholderTextColor="#9AA3B2"
                    />
                  </View>
                  <Text className="text-sm text-gray-700 mb-2 mt-4">Location</Text>
                  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg">
                    <View className="px-3">
                      <LocateIcon width={18} height={18} color="#9AA3B2" />
                    </View>
                    <TextInput
                      placeholder="Enter your location"
                      value={location}
                      onChangeText={setLocation}
                      className="flex-1 py-3 text-gray-900"
                      placeholderTextColor="#9AA3B2"
                    />
                  </View>
                </View>
              )}

              {/* Action button */}
              <View className="mt-3">
                <TouchableOpacity
                  onPress={isLogin ? handleLogin : handleSignUp}
                  activeOpacity={0.85}
                  className="bg-[#0B75FF] py-4 rounded-xl items-center"
                >
                  <Text className="text-white font-semibold text-lg">
                    {isLogin ? 'Log In' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer: Sign up link */}
            <View className="items-center mt-6">
              <Text className="text-sm text-gray-500">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text
                  className="text-blue-600 font-semibold"
                  onPress={() => setIsLogin((v) => !v)}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </Text>
              </Text>
            </View>
          </View>

          {/* Bottom safe area / copyright / spacing (if needed) */}
          <View style={styles.bottomSpace} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomSpace: {
    height: Platform.OS === 'ios' ? 18 : 8,
  },
});

export default AuthScreen;
