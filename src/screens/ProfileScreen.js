import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Calendar, User as UserIcon, Info, LogOut } from 'lucide-react-native';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const getInitial = () => {
    if (user?.name) {
      return user.name[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Fixed Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top + 12, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <Text className="text-3xl font-bold text-gray-900 mb-1">
          Profile
        </Text>
        <Text className="text-sm text-gray-500">
          Manage your account settings
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}
      >
        {/* Profile Card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          {/* Avatar */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#2563EB' }}>
              <Text className="text-5xl text-white font-bold">
                {getInitial()}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              {user?.name || 'User'}
            </Text>
            <View className="flex-row items-center">
              <Mail size={14} color="#9CA3AF" strokeWidth={2} />
              <Text className="text-sm text-gray-500 ml-1.5">
                {user?.email}
              </Text>
            </View>
          </View>

          {/* Info Sections */}
          <View className="space-y-3">
            <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex-row items-center">
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#EFF6FF' }}>
                <Mail size={20} color="#2563EB" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-blue-700 mb-1">
                  EMAIL ADDRESS
                </Text>
                <Text className="text-sm font-bold text-blue-900">
                  {user?.email}
                </Text>
              </View>
            </View>

            <View className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex-row items-center mt-3">
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#EEF2FF' }}>
                <Calendar size={20} color="#4F46E5" strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-indigo-700 mb-1">
                  MEMBER SINCE
                </Text>
                <Text className="text-sm font-bold text-indigo-900">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </Text>
              </View>
            </View>

            {user?.name && (
              <View className="bg-purple-50 rounded-2xl p-4 border border-purple-100 flex-row items-center mt-3">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#FAF5FF' }}>
                  <UserIcon size={20} color="#7C3AED" strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-purple-700 mb-1">
                    FULL NAME
                  </Text>
                  <Text className="text-sm font-bold text-purple-900">
                    {user.name}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* About Section */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#EFF6FF' }}>
              <Info size={20} color="#2563EB" strokeWidth={2} />
            </View>
            <Text className="text-lg font-bold text-gray-900">
              About Inspectable
            </Text>
          </View>
          <Text className="text-sm text-gray-600 leading-6 mb-4">
            Streamline your home inspections with AI-powered analysis and professional PDF reports.
          </Text>
          <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <Text className="text-xs font-semibold text-gray-500">
              VERSION
            </Text>
            <Text className="text-base font-bold text-gray-900 mt-0.5">
              1.0.0
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="rounded-2xl py-4 mb-8 flex-row items-center justify-center"
          style={{
            backgroundColor: '#FEF2F2',
            borderWidth: 1,
            borderColor: '#FEE2E2',
          }}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#DC2626" strokeWidth={2} />
          <Text className="text-red-600 text-center font-bold text-base ml-2">
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
