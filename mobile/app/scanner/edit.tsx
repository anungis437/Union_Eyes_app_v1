/**
 * Document Editor Screen
 * Edit captured documents - crop, rotate, filter, and manage pages
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDocumentsStore, selectDocumentById } from '../../src/store/documentsStore';
import { ImageFilter } from '../../src/types/documents';
import cameraService from '../../src/services/camera';
import { useOCRProcess } from '../../src/hooks/useDocuments';

export default function EditDocumentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = useDocumentsStore(selectDocumentById(id || ''));
  const { updateDocument } = useDocumentsStore();
  const { processImage, isProcessing } = useOCRProcess();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<ImageFilter>(ImageFilter.ORIGINAL);
  const [isProcessingFilter, setIsProcessingFilter] = useState(false);

  const currentPage = document?.pages[currentPageIndex];

  useEffect(() => {
    if (!document) {
      Alert.alert('Error', 'Document not found');
      router.back();
    }
  }, [document]);

  const handleRotate = async () => {
    if (!currentPage) return;

    setIsProcessingFilter(true);
    try {
      const rotatedUri = await cameraService.rotateImage(currentPage.uri, 90);
      const updatedPages = [...(document?.pages || [])];
      updatedPages[currentPageIndex] = { ...currentPage, uri: rotatedUri };
      updateDocument(id!, { pages: updatedPages });
    } catch (error) {
      Alert.alert('Error', 'Failed to rotate image');
    } finally {
      setIsProcessingFilter(false);
    }
  };

  const handleApplyFilter = async (filter: ImageFilter) => {
    if (!currentPage) return;

    setIsProcessingFilter(true);
    setSelectedFilter(filter);

    try {
      let filteredUri = currentPage.uri;

      if (filter !== ImageFilter.ORIGINAL) {
        const filterType = {
          [ImageFilter.BLACK_WHITE]: 'bw',
          [ImageFilter.GRAYSCALE]: 'grayscale',
          [ImageFilter.ENHANCE]: 'enhance',
          [ImageFilter.COLOR]: 'original',
          [ImageFilter.ORIGINAL]: 'original',
        }[filter] as 'bw' | 'grayscale' | 'enhance' | 'original';

        filteredUri = await cameraService.applyFilter(currentPage.uri, filterType);
      }

      const updatedPages = [...(document?.pages || [])];
      updatedPages[currentPageIndex] = { ...currentPage, uri: filteredUri, filter };
      updateDocument(id!, { pages: updatedPages });
    } catch (error) {
      Alert.alert('Error', 'Failed to apply filter');
    } finally {
      setIsProcessingFilter(false);
    }
  };

  const handleRunOCR = async () => {
    if (!currentPage) return;

    try {
      const ocrResult = await processImage(currentPage.uri);

      const updatedPages = [...(document?.pages || [])];
      updatedPages[currentPageIndex] = { ...currentPage, ocrResult };

      const combinedText = updatedPages
        .map((p) => p.ocrResult?.text || '')
        .filter(Boolean)
        .join('\n\n');

      updateDocument(id!, {
        pages: updatedPages,
        ocrText: combinedText,
        language: ocrResult.language,
        confidence: ocrResult.confidence,
      });

      router.push(`/scanner/results?id=${id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to process OCR');
    }
  };

  const handleAddPage = async () => {
    const results = await cameraService.pickImageFromGallery({ quality: 0.9 });
    if (results.length > 0) {
      const newPages = await Promise.all(
        results.map(async (result, index) => ({
          id: `${Date.now()}-${index}`,
          uri: result.uri,
          width: result.width,
          height: result.height,
          size: await cameraService.getFileSize(result.uri),
          order: (document?.pages.length || 0) + index,
          filter: ImageFilter.ORIGINAL,
        }))
      );

      updateDocument(id!, {
        pages: [...(document?.pages || []), ...newPages],
      });
    }
  };

  const handleDeletePage = () => {
    if (!document || document.pages.length <= 1) {
      Alert.alert('Error', 'Document must have at least one page');
      return;
    }

    Alert.alert('Delete Page', 'Are you sure you want to delete this page?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updatedPages = document.pages.filter((_, index) => index !== currentPageIndex);
          updateDocument(id!, { pages: updatedPages });
          if (currentPageIndex >= updatedPages.length) {
            setCurrentPageIndex(updatedPages.length - 1);
          }
        },
      },
    ]);
  };

  const handleSave = () => {
    Alert.alert('Success', 'Document saved successfully', [
      { text: 'View Results', onPress: () => router.push(`/scanner/results?id=${id}`) },
      { text: 'Done', onPress: () => router.back() },
    ]);
  };

  const filters = [
    { type: ImageFilter.ORIGINAL, icon: 'image-outline', label: 'Original' },
    { type: ImageFilter.BLACK_WHITE, icon: 'contrast', label: 'B&W' },
    { type: ImageFilter.GRAYSCALE, icon: 'ellipse-outline', label: 'Gray' },
    { type: ImageFilter.ENHANCE, icon: 'sparkles', label: 'Enhance' },
  ];

  if (!document || !currentPage) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Document',
          headerRight: () => (
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {isProcessingFilter && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>Processing...</Text>
            </View>
          )}
          <Image source={{ uri: currentPage.uri }} style={styles.image} resizeMode="contain" />
        </View>

        {/* Page Thumbnails */}
        {document.pages.length > 1 && (
          <ScrollView
            horizontal
            style={styles.thumbnailsContainer}
            showsHorizontalScrollIndicator={false}
          >
            {document.pages.map((page, index) => (
              <TouchableOpacity
                key={page.id}
                style={[styles.thumbnail, currentPageIndex === index && styles.thumbnailActive]}
                onPress={() => setCurrentPageIndex(index)}
              >
                <Image source={{ uri: page.uri }} style={styles.thumbnailImage} />
                <Text style={styles.thumbnailLabel}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addPageButton} onPress={handleAddPage}>
              <Ionicons name="add" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersList}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.type}
                  style={[
                    styles.filterButton,
                    selectedFilter === filter.type && styles.filterButtonActive,
                  ]}
                  onPress={() => handleApplyFilter(filter.type)}
                  disabled={isProcessingFilter}
                >
                  <Ionicons
                    name={filter.icon as any}
                    size={24}
                    color={selectedFilter === filter.type ? '#3b82f6' : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.filterLabel,
                      selectedFilter === filter.type && styles.filterLabelActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleRotate}>
            <Ionicons name="refresh" size={24} color="#3b82f6" />
            <Text style={styles.actionLabel}>Rotate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRunOCR}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#3b82f6" />
            ) : (
              <Ionicons name="text" size={24} color="#3b82f6" />
            )}
            <Text style={styles.actionLabel}>OCR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDeletePage}>
            <Ionicons name="trash" size={24} color="#ef4444" />
            <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleAddPage}>
            <Ionicons name="add-circle" size={24} color="#10b981" />
            <Text style={[styles.actionLabel, { color: '#10b981' }]}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 16,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  thumbnailsContainer: {
    maxHeight: 100,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  thumbnail: {
    width: 80,
    height: 80,
    margin: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailActive: {
    borderColor: '#3b82f6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailLabel: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addPageButton: {
    width: 80,
    height: 80,
    margin: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  filtersList: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    minWidth: 70,
  },
  filterButtonActive: {
    backgroundColor: '#eff6ff',
  },
  filterLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filterLabelActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
});

