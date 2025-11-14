import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, MapPin, Loader, Home } from 'lucide-react-native';
import * as Location from 'expo-location';
import { usePropertyStore } from '../stores/propertyStore';
import PropertyCard from '../components/PropertyCard';

export default function PropertyListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { properties, fetchProperties, createProperty, isLoading } = usePropertyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyAddress, setNewPropertyAddress] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  };

  const getLocationAddress = async () => {
    try {
      setFetchingLocation(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to auto-fill address');
        setFetchingLocation(false);
        return;
      }

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        
        // Build complete address with house number
        const addressParts = [];
        
        // Add street number (house number) if available
        if (address.streetNumber) {
          addressParts.push(address.streetNumber);
        }
        
        // Add street name if available
        if (address.street) {
          addressParts.push(address.street);
        }
        
        // Create street address line
        const streetAddress = addressParts.join(' ');
        
        // Build full address with city, state, and zip
        const cityStateZip = [
          address.city || '',
          address.region || address.state || '',
          address.postalCode || ''
        ].filter(part => part).join(' ');
        
        // Combine everything
        const formattedAddress = [streetAddress, cityStateZip]
          .filter(part => part)
          .join(', ');
        
        setNewPropertyAddress(formattedAddress);
      } else {
        Alert.alert('Location Found', 'Could not find address for this location. Please enter manually.');
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location. Please check location services are enabled.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleCreateProperty = async () => {
    if (!newPropertyName.trim() || !newPropertyAddress.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const result = await createProperty({
      name: newPropertyName,
      address: newPropertyAddress,
    });

    if (result.success) {
      setModalVisible(false);
      setNewPropertyName('');
      setNewPropertyAddress('');
      // Properties list automatically updates via store
    } else {
      Alert.alert('Error', result.error);
    }
  };

  // Filter properties based on search query
  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View className="flex-1" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <Text className="text-3xl font-bold text-gray-900 mb-1">
          Properties
        </Text>
        <Text className="text-sm text-gray-500 mb-4">
          Manage your inspection properties
        </Text>

        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
          <Search size={20} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            className="flex-1 ml-3 text-base text-gray-900"
            placeholder="Search properties..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text className="text-gray-400 font-bold">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading && properties.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-500 mt-4">Loading properties...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() =>
                navigation.navigate('PropertyDetail', { propertyId: item.id })
              }
            />
          )}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-8">
              <View className="w-24 h-24 rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#EFF6FF' }}>
                <Home size={48} color="#2563EB" strokeWidth={1.5} />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                {searchQuery ? 'No Results Found' : 'No Properties Yet'}
              </Text>
              <Text className="text-base text-gray-500 text-center mb-6 leading-6">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Start by creating your first property to begin inspections'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#2563EB',
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text className="text-white font-bold text-base ml-2">
                    Create Property
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Floating Add Button */}
      {properties.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setModalVisible(true)}
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#2563EB',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {/* Add Property Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingBottom: 40, paddingHorizontal: 24, maxHeight: '80%' }}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Handle Bar */}
                  <View className="items-center mb-6">
                    <View style={{ width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 }} />
                  </View>

                  <Text className="text-2xl font-bold text-gray-900 mb-2">
                    New Property
                  </Text>
                  <Text className="text-sm text-gray-500 mb-6">
                    Add a new property to start inspections
                  </Text>

                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">
                      Property Name
                    </Text>
                    <View
                      className={`bg-gray-50 rounded-2xl px-4 py-4 ${
                        focusedField === 'name' ? 'border-2 border-blue-500' : 'border border-gray-200'
                      }`}
                    >
                      <TextInput
                        className="text-base text-gray-900"
                        placeholder="e.g., 123 Main St Inspection"
                        placeholderTextColor="#9CA3AF"
                        value={newPropertyName}
                        onChangeText={setNewPropertyName}
                        returnKeyType="next"
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>

                  <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-2 ml-1">
                      <Text className="text-sm font-semibold text-gray-700">
                        Address
                      </Text>
                      <TouchableOpacity
                        onPress={getLocationAddress}
                        disabled={fetchingLocation}
                        activeOpacity={0.7}
                        className="flex-row items-center px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: fetchingLocation ? '#DBEAFE' : '#EFF6FF',
                          opacity: fetchingLocation ? 0.8 : 1,
                        }}
                      >
                        {fetchingLocation ? (
                          <>
                            <ActivityIndicator size="small" color="#2563EB" />
                            <Text className="text-xs font-semibold text-blue-600 ml-2">
                              Getting location...
                            </Text>
                          </>
                        ) : (
                          <>
                            <MapPin size={14} color="#2563EB" strokeWidth={2} />
                            <Text className="text-xs font-semibold text-blue-600 ml-1">
                              Use Location
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View
                      className={`bg-gray-50 rounded-2xl px-4 py-4 ${
                        focusedField === 'address' ? 'border-2 border-blue-500' : 'border border-gray-200'
                      }`}
                    >
                      <TextInput
                        className="text-base text-gray-900"
                        placeholder="Full property address"
                        placeholderTextColor="#9CA3AF"
                        value={newPropertyAddress}
                        onChangeText={setNewPropertyAddress}
                        multiline
                        numberOfLines={3}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        onFocus={() => setFocusedField('address')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className="flex-1 rounded-2xl py-4"
                      style={{ backgroundColor: '#F1F5F9' }}
                      onPress={() => {
                        Keyboard.dismiss();
                        setModalVisible(false);
                        setNewPropertyName('');
                        setNewPropertyAddress('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-700 text-center font-bold text-base">
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="flex-1 rounded-2xl py-4"
                      style={{
                        backgroundColor: '#2563EB',
                        shadowColor: '#2563EB',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                      }}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleCreateProperty();
                      }}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-white text-center font-bold text-base">
                          Create
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
