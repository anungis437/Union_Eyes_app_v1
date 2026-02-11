/**
 * Document Scanner Screen
 * Main screen for capturing documents with camera and OCR
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDocumentCapture, useCameraPermissions } from '../../src/hooks/useDocuments';
import { DocumentType, DocumentStatus } from '../../src/types/documents';

export default function ScannerScreen() {
  const router = useRouter();
  const { captureDocument, pickFromGallery, isCapturing } = useDocumentCapture();
  const { hasPermission, requestPermission } = useCameraPermissions();
  const [documentType, setDocumentType] = useState<DocumentType>(DocumentType.OTHER);
  const [runOCR, setRunOCR] = useState(true);

  const handleCapturePhoto = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera access is required to capture documents');
        return;
      }
    }

    const document = await captureDocument(documentType, {
      runOCR,
      title: `${documentType} - ${new Date().toLocaleDateString()}`,
    });

    if (document) {
      Alert.alert('Success', 'Document captured successfully', [
        {
          text: 'View',
          onPress: () => router.push(`/scanner/edit?id=${document.id}`),
        },
        { text: 'OK' },
      ]);
    }
  };

  const handlePickFromGallery = async () => {
    const document = await pickFromGallery(documentType, {
      runOCR,
      allowsMultiple: true,
    });

    if (document) {
      Alert.alert('Success', 'Images imported successfully', [
        {
          text: 'View',
          onPress: () => router.push(`/scanner/edit?id=${document.id}`),
        },
        { text: 'OK' },
      ]);
    }
  };

  const documentTypes = [
    { type: DocumentType.CLAIM, icon: 'document-text', label: 'Claim' },
    { type: DocumentType.RECEIPT, icon: 'receipt', label: 'Receipt' },
    { type: DocumentType.INVOICE, icon: 'cash', label: 'Invoice' },
    { type: DocumentType.MEDICAL_RECORD, icon: 'medical', label: 'Medical' },
    { type: DocumentType.ID_CARD, icon: 'card', label: 'ID Card' },
    { type: DocumentType.CONTRACT, icon: 'document', label: 'Contract' },
    { type: DocumentType.OTHER, icon: 'ellipsis-horizontal', label: 'Other' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Document Scanner',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Document Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Document Type</Text>
          <View style={styles.typeGrid}>
            {documentTypes.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={[styles.typeCard, documentType === item.type && styles.typeCardActive]}
                onPress={() => setDocumentType(item.type)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={32}
                  color={documentType === item.type ? '#3b82f6' : '#6b7280'}
                />
                <Text
                  style={[styles.typeLabel, documentType === item.type && styles.typeLabelActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* OCR Toggle */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.optionRow} onPress={() => setRunOCR(!runOCR)}>
            <View style={styles.optionLeft}>
              <Ionicons name="text" size={24} color="#3b82f6" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Extract Text (OCR)</Text>
                <Text style={styles.optionDescription}>
                  Automatically extract text from the document
                </Text>
              </View>
            </View>
            <View style={[styles.toggle, runOCR && styles.toggleActive]}>
              <View style={[styles.toggleThumb, runOCR && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Capture Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Capture Options</Text>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapturePhoto}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.captureButtonText}>Take Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, styles.captureButtonSecondary]}
            onPress={handlePickFromGallery}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#3b82f6" />
            ) : (
              <>
                <Ionicons name="images" size={24} color="#3b82f6" />
                <Text style={styles.captureButtonTextSecondary}>Choose from Gallery</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Help Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips for Best Results</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.tipText}>Ensure good lighting for clear images</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.tipText}>Place document on a flat, contrasting surface</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.tipText}>Avoid shadows and glare on the document</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.tipText}>Hold the camera parallel to the document</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  typeCardActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  typeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  typeLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    marginLeft: 20,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  captureButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  captureButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

