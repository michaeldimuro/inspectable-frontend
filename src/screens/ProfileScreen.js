import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Calendar, User as UserIcon, Info, LogOut, Trash2, AlertTriangle, X } from 'lucide-react-native';
import { useAuthStore } from '../stores/authStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount, isLoading } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteAccount = async () => {
    setDeleteError('');
    
    // Validate email matches
    if (confirmEmail.toLowerCase() !== user?.email?.toLowerCase()) {
      setDeleteError('Email address does not match your account');
      return;
    }

    const result = await deleteAccount(confirmEmail);
    
    if (result.success) {
      setShowDeleteModal(false);
      setConfirmEmail('');
      // User will be automatically logged out and redirected
    } else {
      setDeleteError(result.error || 'Failed to delete account');
    }
  };

  const openDeleteModal = () => {
    setConfirmEmail('');
    setDeleteError('');
    setShowDeleteModal(true);
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
          className="rounded-2xl py-4 mb-4 flex-row items-center justify-center"
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

        {/* Delete Account Button */}
        <TouchableOpacity
          className="rounded-2xl py-4 mb-8 flex-row items-center justify-center"
          style={{
            backgroundColor: '#7F1D1D',
            borderWidth: 1,
            borderColor: '#991B1B',
          }}
          onPress={openDeleteModal}
          activeOpacity={0.7}
        >
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
          <Text className="text-white text-center font-bold text-base ml-2">
            Delete Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#FEE2E2' }}>
                  <AlertTriangle size={22} color="#DC2626" strokeWidth={2} />
                </View>
                <Text className="text-xl font-bold text-gray-900">
                  Delete Account
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: '#F1F5F9' }}
              >
                <X size={18} color="#64748B" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Warning Message */}
            <View className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200">
              <Text className="text-sm text-red-800 leading-5 font-medium">
                This action is permanent and cannot be undone. All your data including properties, inspection areas, and reports will be permanently deleted.
              </Text>
            </View>

            {/* Confirmation Instructions */}
            <Text className="text-sm text-gray-600 mb-2">
              To confirm deletion, please enter your email address:
            </Text>
            <Text className="text-sm font-bold text-gray-900 mb-3">
              {user?.email}
            </Text>

            {/* Email Input */}
            <TextInput
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: deleteError ? '#FCA5A5' : '#E2E8F0',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: '#1F2937',
                marginBottom: deleteError ? 8 : 16,
              }}
            />

            {/* Error Message */}
            {deleteError ? (
              <Text className="text-sm text-red-600 mb-4">
                {deleteError}
              </Text>
            ) : null}

            {/* Action Buttons */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 rounded-xl py-3.5 items-center justify-center mr-2"
                style={{ backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' }}
                onPress={() => setShowDeleteModal(false)}
                disabled={isLoading}
              >
                <Text className="text-gray-700 font-bold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl py-3.5 items-center justify-center flex-row ml-2"
                style={{ 
                  backgroundColor: isLoading ? '#F87171' : '#DC2626',
                  opacity: isLoading ? 0.7 : 1
                }}
                onPress={handleDeleteAccount}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text className="text-white font-bold text-base ml-1.5">
                      Delete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
