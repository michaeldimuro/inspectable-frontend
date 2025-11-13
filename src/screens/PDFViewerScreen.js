import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Dimensions, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Download } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export default function PDFViewerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { pdfPath, propertyName } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pdfBase64, setPdfBase64] = useState(null);

  const handleShare = async () => {
    try {
      setSharing(true);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share the PDF
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `${propertyName} - Inspection Report`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share the report');
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    try {
      Alert.alert(
        'Success',
        'Report is ready to share. Use the share button to send it via email, messages, or save to files.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to prepare download');
    }
  };

  // Load PDF as base64 for WebView
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        const base64 = await FileSystem.readAsStringAsync(pdfPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setPdfBase64(base64);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadPDF();
  }, [pdfPath]);

  // Show loading state
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="mr-3">
              <ChevronLeft size={28} color="#2563EB" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900 flex-1">Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="mr-3">
              <ChevronLeft size={28} color="#2563EB" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900 flex-1">Error</Text>
          </View>
        </View>
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Failed to load PDF</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // WebView PDF viewer with PDF.js (works in Expo Go!)
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background-color: #525659; 
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          #pdf-container { 
            width: 100%;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .pdf-page {
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            margin-bottom: 10px;
          }
          canvas {
            display: block;
            width: 100% !important;
            height: auto !important;
          }
          #loading {
            color: white;
            text-align: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="loading">Loading PDF...</div>
        <div id="pdf-container"></div>
        
        <script>
          // Configure PDF.js worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          
          // Load PDF from base64
          const pdfData = atob('${pdfBase64}');
          const loadingTask = pdfjsLib.getDocument({ data: pdfData });
          
          loadingTask.promise.then(function(pdf) {
            document.getElementById('loading').style.display = 'none';
            const container = document.getElementById('pdf-container');
            
            // Render all pages
            const numPages = pdf.numPages;
            
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
              pdf.getPage(pageNum).then(function(page) {
                const scale = 2.0; // Higher scale for better quality
                const viewport = page.getViewport({ scale: scale });
                
                const canvas = document.createElement('canvas');
                canvas.className = 'pdf-page';
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                container.appendChild(canvas);
                
                const renderContext = {
                  canvasContext: context,
                  viewport: viewport
                };
                
                page.render(renderContext);
              });
            }
          }).catch(function(error) {
            document.getElementById('loading').innerHTML = 'Error loading PDF: ' + error.message;
            console.error('PDF loading error:', error);
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={{ flex: 1, backgroundColor: '#525659' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} className="mr-3">
            <ChevronLeft size={28} color="#2563EB" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
            {propertyName}
          </Text>
          <TouchableOpacity onPress={handleShare} disabled={sharing} activeOpacity={0.7} className="ml-3">
            {sharing ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Share2 size={24} color="#2563EB" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView PDF Viewer */}
      <WebView
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: '#525659' }}
        originWhitelist={['*']}
        scalesPageToFit={true}
        bounces={false}
        scrollEnabled={true}
        automaticallyAdjustContentInsets={false}
        contentInset={{ top: 0, right: 0, bottom: 0, left: 0 }}
      />

      {/* Footer with Share Button - Gradient Blur Background */}
      <BlurView
        intensity={80}
        tint="light"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
          paddingHorizontal: 20,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(249, 250, 251, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing}
          className="rounded-2xl py-4"
          style={{
            backgroundColor: '#2563EB',
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.8}
        >
          {sharing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View className="flex-row items-center justify-center">
              <Share2 size={20} color="#FFFFFF" strokeWidth={2} />
              <Text className="text-white font-bold text-base ml-2">
                Share Report
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  errorButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: 'bold',
  },
});

