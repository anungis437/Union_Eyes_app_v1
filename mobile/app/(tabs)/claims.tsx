import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SearchBar } from '@/components/SearchBar';
import { FilterSheet } from '@/components/FilterSheet';
import { ClaimCard } from '@/components/ClaimCard';
import EmptyState from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { ClaimListItem } from '@/types/claims';
import { format } from 'date-fns';

type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'cancelled';
type ClaimType = 'overtime' | 'grievance' | 'safety' | 'benefits' | 'other';

interface Claim {
  id: string;
  claimNumber: string;
  type: ClaimType;
  title: string;
  description: string;
  status: ClaimStatus;
  submittedDate: Date;
  updatedDate: Date;
  amount?: number;
  priority?: 'low' | 'medium' | 'high';
}

const FILTER_OPTIONS = {
  status: [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Cancelled', value: 'cancelled' },
  ],
  type: [
    { label: 'All', value: 'all' },
    { label: 'Overtime', value: 'overtime' },
    { label: 'Grievance', value: 'grievance' },
    { label: 'Safety', value: 'safety' },
    { label: 'Benefits', value: 'benefits' },
    { label: 'Other', value: 'other' },
  ],
  sort: [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Status', value: 'status' },
    { label: 'Amount', value: 'amount' },
  ],
};

export default function ClaimsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    sort: 'newest',
  });

  const {
    data: claims,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['claims'],
    queryFn: async (): Promise<ClaimListItem[]> => {
      // Mock data - replace with actual API call
      return [
        {
          id: '1',
          claimNumber: 'CLM-2024-001',
          type: 'overtime',
          title: 'Overtime Pay - January 2024',
          status: 'pending',
          priority: 'high',
          submittedBy: { id: 'user1', name: 'John Doe' },
          createdAt: new Date(2024, 0, 15),
          updatedAt: new Date(2024, 0, 20),
          documentCount: 2,
          commentCount: 3,
        },
        {
          id: '2',
          claimNumber: 'CLM-2024-002',
          type: 'grievance',
          title: 'Schedule Change Grievance',
          status: 'under_review',
          priority: 'medium',
          submittedBy: { id: 'user2', name: 'Jane Smith' },
          createdAt: new Date(2024, 0, 10),
          updatedAt: new Date(2024, 0, 18),
          documentCount: 1,
          commentCount: 5,
        },
        {
          id: '3',
          claimNumber: 'CLM-2023-089',
          type: 'safety',
          title: 'Workplace Safety Violation',
          status: 'approved',
          priority: 'high',
          submittedBy: { id: 'user3', name: 'Bob Johnson' },
          createdAt: new Date(2023, 11, 5),
          updatedAt: new Date(2023, 11, 20),
          documentCount: 4,
          commentCount: 2,
        },
        {
          id: '4',
          claimNumber: 'CLM-2023-078',
          type: 'benefits',
          title: 'Healthcare Reimbursement',
          status: 'rejected',
          priority: 'low',
          submittedBy: { id: 'user4', name: 'Alice Brown' },
          createdAt: new Date(2023, 10, 12),
          updatedAt: new Date(2023, 10, 25),
          documentCount: 3,
          commentCount: 1,
        },
      ];
    },
  });

  const filteredAndSortedClaims = useMemo(() => {
    if (!claims) return [];

    let filtered = claims;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (claim) =>
          claim.title.toLowerCase().includes(query) ||
          claim.claimNumber.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((claim) => claim.status === filters.status);
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((claim) => claim.type === filters.type);
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (filters.sort) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'status':
        sorted.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'amount':
        // ClaimListItem doesn't have amount, sort by createdAt instead
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }

    return sorted;
  }, [claims, searchQuery, filters]);

  const handleClaimPress = (claimId: string) => {
    router.push(`/claims/${claimId}` as any);
  };

  const handleNewClaim = () => {
    router.push('/claims/new');
  };

  const handleApplyFilters = (newFilters: { [key: string]: string }) => {
    setFilters(newFilters as typeof filters);
    setFilterSheetVisible(false);
  };

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== 'all' && value !== 'newest'
  ).length;

  const styles = createStyles(isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Claims</Text>
        <TouchableOpacity
          style={styles.newClaimButton}
          onPress={handleNewClaim}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search claims..."
          style={styles.searchBar}
        />
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setFilterSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="filter"
            size={20}
            color={activeFilterCount > 0 ? '#fff' : isDark ? '#9CA3AF' : '#6B7280'}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Claims List */}
      <FlatList
        data={filteredAndSortedClaims}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClaimCard claim={item} onPress={() => handleClaimPress(item.id)} />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredAndSortedClaims.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={isDark ? '#fff' : '#000'}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title={searchQuery ? 'No claims found' : 'No claims yet'}
            message={
              searchQuery
                ? 'Try adjusting your search or filters'
                : 'Submit your first claim to get started'
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Sheet */}
      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filters={filters}
        filterOptions={FILTER_OPTIONS}
        onApply={handleApplyFilters}
      />
    </SafeAreaView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#F9FAFB',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    newClaimButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#3B82F6',
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: isDark ? '#1F2937' : '#fff',
    },
    searchBar: {
      flex: 1,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    filterButtonActive: {
      backgroundColor: '#3B82F6',
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    listContent: {
      padding: 16,
      paddingBottom: 32,
    },
    emptyListContent: {
      flex: 1,
      justifyContent: 'center',
    },
  });
