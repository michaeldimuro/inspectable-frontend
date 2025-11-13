import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: '#F8FAFC' }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 justify-center px-8 py-12">
            {/* Logo Section */}
            <View className="items-center mb-12">
              <View className="bg-gradient-to-br from-blue-600 to-indigo-700 w-20 h-20 rounded-3xl items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: '#2563EB' }}>
                <Text className="text-4xl">🏠</Text>
              </View>
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </Text>
              <Text className="text-gray-500 text-center text-base">
                Sign in to continue your inspections
              </Text>
            </View>
            
            {/* Form Section */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">
                Email Address
              </Text>
              <View
                className={`bg-white rounded-2xl px-4 py-4 shadow-sm ${
                  focusedField === 'email' ? 'border-2 border-blue-500' : 'border border-gray-200'
                }`}
              >
                <TextInput
                  className="text-base text-gray-900"
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">
                Password
              </Text>
              <View
                className={`bg-white rounded-2xl px-4 py-4 shadow-sm ${
                  focusedField === 'password' ? 'border-2 border-blue-500' : 'border border-gray-200'
                }`}
              >
                <TextInput
                  className="text-base text-gray-900"
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  returnKeyType="go"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    handleLogin();
                  }}
                />
              </View>
            </View>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
                <Text className="text-red-700 text-center text-sm">{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              className="rounded-2xl overflow-hidden shadow-lg mb-4"
              onPress={() => {
                Keyboard.dismiss();
                handleLogin();
              }}
              disabled={isLoading}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#2563EB',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <View className="py-4 px-6">
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white text-center font-bold text-lg">
                    Sign In
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Register Link */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              className="py-3"
              activeOpacity={0.7}
            >
              <Text className="text-gray-600 text-center text-base">
                Don't have an account?{' '}
                <Text className="text-blue-600 font-semibold">Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

