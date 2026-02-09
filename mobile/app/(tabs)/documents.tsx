/**
 * Documents Tab Screen
 * View, search, and manage captured documents with OCR
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDocuments, useDocumentSearch } from '@/hooks/useDocuments';
import { useDocumentsStore } from '@/store/documentsStore';
import { Document, DocumentViewMode, DocumentStatus } from '@/types/documents';
import { formatDistanceToNow } from 'date-fns';

export default function DocumentsScreen() {
  const router = useRouter();
  const { documents, isLoading } = useDocuments();
  const { searchQuery, setSearchQuery, results } = useDocumentSearch();
  const { preferences, setViewMode, loadFromStorage } = useDocumentsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFromStorage();
    setRefreshing(false);
  };

  const handleScan = () => {
    router.push('/scanner/');
  };

  const handleDocumentPress = (doc: Document) => {
    router.push(`/documents/${doc.id}`);
  };

  const getDocumentIcon = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.UPLOADING:
        return 'cloud-upload-outline';
      case DocumentStatus.PROCESSING:
      case DocumentStatus.OCR_PROCESSING:
        return 'hourglass-outline';
      case DocumentStatus.COMPLETED:
      case DocumentStatus.OCR_COMPLETED:
        return 'checkmark-circle';
      case DocumentStatus.FAILED:
      case DocumentStatus.OCR_FAILED:
        return 'alert-circle';
      default:
        return 'document-text-outline';
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.COMPLETED:
      case DocumentStatus.OCR_COMPLETED:
        return '#10b981';
      case DocumentStatus.UPLOADING:
      case DocumentStatus.PROCESSING:
      case DocumentStatus.OCR_PROCESSING:
        return '#f59e0b';
      case DocumentStatus.FAILED:
      case DocumentStatus.OCR_FAILED:
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderDocumentCard = ({ item }: { item: Document }) => {
    const firstPage = item.pages[0];
    const statusColor = getStatusColor(item.status);
    const statusIcon = getDocumentIcon(item.status);

    if (preferences.viewMode === DocumentViewMode.GRID) {
      return (
        <TouchableOpacity style={styles.gridCard} onPress={() => handleDocumentPress(item)}>
          {firstPage && <Image source={{ uri: firstPage.uri }} style={styles.gridImage} />}
          <View style={styles.gridOverlay}>
            <View style={styles.gridHeader}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Ionicons name={statusIcon as any} size={12} color="#fff" />
              </View>
              {item.pages.length > 1 && (
                <View style={styles.pagesBadge}>
                  <Ionicons name="layers" size={12} color="#fff" />
                  <Text style={styles.pagesBadgeText}>{item.pages.length}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.gridInfo}>
            <Text style={styles.gridTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.gridMeta}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    // List view
    return (
      <TouchableOpacity style={styles.listCard} onPress={() => handleDocumentPress(item)}>
        {firstPage && <Image source={{ uri: firstPage.uri }} style={styles.listImage} />}
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.listMeta}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.listMetaText}>{item.type}</Text>
            <Text style={styles.listMetaText}>•</Text>
            <Text style={styles.listMetaText}>
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
          </View>
          {item.ocrText && (
            <Text style={styles.listPreview} numberOfLines={2}>
              {item.ocrText}
            </Text>
          )}
        </View>
        <View style={styles.listActions}>
          {item.pages.length > 1 && (
            <View style={styles.pagesIndicator}>
              <Ionicons name="layers-outline" size={16} color="#6b7280" />
              <Text style={styles.pagesText}>{item.pages.length}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  const displayDocuments = searchQuery ? results : documents;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() =>
              setViewMode(
                preferences.viewMode === DocumentViewMode.GRID
                  ? DocumentViewMode.LIST
                  : DocumentViewMode.GRID
              )
            }
            style={styles.headerButton}
          >
            <Ionicons
              name={preferences.viewMode === DocumentViewMode.GRID ? 'list' : 'grid-outline'}
              size={24}
              color="#3b82f6"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Documents List */}
      <FlatList
        data={displayDocuments}
        renderItem={renderDocumentCard}
        keyExtractor={(item) => item.id}
        numColumns={preferences.viewMode === DocumentViewMode.GRID ? 2 : 1}
        key={preferences.viewMode}
        contentContainerStyle={[
          styles.listContent,
          preferences.viewMode === DocumentViewMode.GRID && styles.gridContent,
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Documents Yet</Text>
            <Text style={styles.emptyText}>Scan or upload your first document to get started</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleScan}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Scan Document</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB - Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={handleScan}>
          <Ionicons name="camera" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  listContent: {
    padding: 16,
  },
  gridContent: {
    paddingBottom: 100,
  },
  // Grid Card Styles
  gridCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: '#e5e7eb',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pagesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pagesBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  gridInfo: {
    padding: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  gridMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  // List Card Styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  listPreview: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  listActions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pagesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pagesText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
