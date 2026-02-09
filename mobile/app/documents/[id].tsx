/**
 * Document Viewer Screen
 * View document details with multi-page support and OCR overlay
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDocumentsStore, selectDocumentById } from '../../src/store/documentsStore';
import { useDocumentViewer } from '../../src/hooks/useDocuments';
import { formatDistanceToNow } from 'date-fns';

export default function DocumentViewerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = useDocumentsStore(selectDocumentById(id || ''));
  const { updateDocument, deleteDocument } = useDocumentsStore();
  const {
    currentPage,
    totalPages,
    zoom,
    showOCROverlay,
    goToPage,
    nextPage,
    previousPage,
    setZoom,
    toggleOCROverlay,
  } = useDocumentViewer(id || '');

  if (!document) {
    Alert.alert('Error', 'Document not found');
    router.back();
    return null;
  }

  const currentPageData = document.pages[currentPage];

  const handleShare = async () => {
    try {
      await Share.share({
        message: document.title,
        title: document.title,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share document');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteDocument(id!);
            router.back();
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/scanner/edit?id=${id}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: document.title,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Ionicons name="share-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                <Ionicons name="create-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Document Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="layers-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {totalPages} {totalPages === 1 ? 'page' : 'pages'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cloud-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{(document.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
          </View>
        </View>

        {/* Image Viewer */}
        <View style={styles.imageContainer}>
          <ScrollView
            style={styles.imageScroll}
            contentContainerStyle={styles.imageScrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Image
              source={{ uri: currentPageData?.uri }}
              style={[
                styles.image,
                {
                  transform: [{ scale: zoom }],
                },
              ]}
              resizeMode="contain"
            />

            {/* OCR Overlay */}
            {showOCROverlay && currentPageData?.ocrResult && (
              <View style={styles.ocrOverlay}>
                {currentPageData.ocrResult.blocks.map((block, index) => (
                  <View
                    key={index}
                    style={[
                      styles.ocrBlock,
                      {
                        left: block.boundingBox.left * zoom,
                        top: block.boundingBox.top * zoom,
                        width: block.boundingBox.width * zoom,
                        height: block.boundingBox.height * zoom,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          {/* Page Controls */}
          {totalPages > 1 && (
            <View style={styles.pageControls}>
              <TouchableOpacity
                style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                onPress={previousPage}
                disabled={currentPage === 0}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.pageIndicator}>
                <Text style={styles.pageText}>
                  {currentPage + 1} / {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  currentPage === totalPages - 1 && styles.pageButtonDisabled,
                ]}
                onPress={nextPage}
                disabled={currentPage === totalPages - 1}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => setZoom(Math.max(1, zoom - 0.5))}
              disabled={zoom <= 1}
            >
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>

            <TouchableOpacity
              style={styles.zoomButton}
              onPress={() => setZoom(Math.min(3, zoom + 0.5))}
              disabled={zoom >= 3}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={toggleOCROverlay}>
            <Ionicons
              name={showOCROverlay ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color="#3b82f6"
            />
            <Text style={styles.actionLabel}>{showOCROverlay ? 'Hide OCR' : 'Show OCR'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/scanner/results?id=${id}`)}
          >
            <Ionicons name="text-outline" size={24} color="#3b82f6" />
            <Text style={styles.actionLabel}>View Text</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color="#3b82f6" />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Download')}>
            <Ionicons name="download-outline" size={24} color="#3b82f6" />
            <Text style={styles.actionLabel}>Download</Text>
          </TouchableOpacity>
        </View>

        {/* Document Details */}
        <ScrollView style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Document Details</Text>

          {document.description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{document.description}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{document.type}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{document.status}</Text>
          </View>

          {document.language && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailValue}>{document.language.toUpperCase()}</Text>
            </View>
          )}

          {document.confidence && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>OCR Confidence</Text>
              <Text style={styles.detailValue}>{Math.round(document.confidence * 100)}%</Text>
            </View>
          )}

          {document.tags.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tags</Text>
              <View style={styles.tagsContainer}>
                {document.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
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
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  headerButton: {
    padding: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  imageScroll: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ocrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ocrBlock: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  pageControls: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  pageButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageIndicator: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  zoomButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  zoomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  detailsContainer: {
    maxHeight: 200,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  tagText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
});
