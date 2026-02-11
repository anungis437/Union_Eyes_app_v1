/**
 * Claims Filter Sheet Component
 * Bottom sheet with advanced filtering options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useClaimsStore, useActiveFiltersCount } from '@/store/claimsStore';
import { ClaimStatus, ClaimType, ClaimPriority } from '@/types/claims';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

const STATUS_OPTIONS: Array<{ value: ClaimStatus; label: string; color: string }> = [
  { value: 'draft', label: 'Draft', color: '#6B7280' },
  { value: 'submitted', label: 'Submitted', color: '#3B82F6' },
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
  { value: 'under_review', label: 'Under Review', color: '#8B5CF6' },
  { value: 'approved', label: 'Approved', color: '#10B981' },
  { value: 'rejected', label: 'Rejected', color: '#EF4444' },
  { value: 'appealed', label: 'Appealed', color: '#F97316' },
  { value: 'withdrawn', label: 'Withdrawn', color: '#6B7280' },
  { value: 'closed', label: 'Closed', color: '#4B5563' },
];

const TYPE_OPTIONS: Array<{ value: ClaimType; label: string; icon: string }> = [
  { value: 'grievance', label: 'Grievance', icon: 'alert-circle' },
  { value: 'safety', label: 'Safety', icon: 'shield' },
  { value: 'leave', label: 'Leave', icon: 'calendar' },
  { value: 'overtime', label: 'Overtime', icon: 'time' },
  { value: 'benefits', label: 'Benefits', icon: 'medkit' },
  { value: 'discrimination', label: 'Discrimination', icon: 'people' },
  { value: 'harassment', label: 'Harassment', icon: 'warning' },
  { value: 'wage', label: 'Wage', icon: 'cash' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

const PRIORITY_OPTIONS: Array<{ value: ClaimPriority; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: '#10B981' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'urgent', label: 'Urgent', color: '#DC2626' },
];

const SORT_OPTIONS = [
  { field: 'updatedAt', direction: 'desc', label: 'Recently Updated' },
  { field: 'createdAt', direction: 'desc', label: 'Newest First' },
  { field: 'createdAt', direction: 'asc', label: 'Oldest First' },
  { field: 'priority', direction: 'desc', label: 'Priority (High to Low)' },
  { field: 'status', direction: 'asc', label: 'Status' },
] as const;

interface ClaimsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function ClaimsFilterSheet({ visible, onClose }: ClaimsFilterSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);

  const {
    selectedStatuses,
    selectedTypes,
    selectedPriorities,
    dateRange,
    sort,
    toggleStatus,
    toggleType,
    togglePriority,
    setDateRange,
    setSort,
    clearFilters,
  } = useClaimsStore();

  const activeFiltersCount = useActiveFiltersCount();

  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);

  const handleApply = () => {
    onClose();
  };

  const handleClear = () => {
    clearFilters();
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(null);
    if (selectedDate && showDatePicker) {
      if (showDatePicker === 'from') {
        setDateRange(selectedDate, dateRange.to);
      } else {
        setDateRange(dateRange.from, selectedDate);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters & Sort</Text>
            <View style={styles.headerActions}>
              {activeFiltersCount > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={isDark ? '#F9FAFB' : '#111827'} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Sort Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              {SORT_OPTIONS.map((option) => {
                const isSelected =
                  sort.field === option.field && sort.direction === option.direction;
                return (
                  <TouchableOpacity
                    key={`${option.field}-${option.direction}`}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => setSort({ field: option.field, direction: option.direction })}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.chipContainer}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = selectedStatuses.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        isSelected && { ...styles.chipSelected, borderColor: option.color },
                      ]}
                      onPress={() => toggleStatus(option.value)}
                    >
                      <View style={[styles.chipDot, { backgroundColor: option.color }]} />
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && { ...styles.chipTextSelected, color: option.color },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={option.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Type Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type</Text>
              <View style={styles.chipContainer}>
                {TYPE_OPTIONS.map((option) => {
                  const isSelected = selectedTypes.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleType(option.value)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={16}
                        color={isSelected ? '#3B82F6' : isDark ? '#9CA3AF' : '#6B7280'}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Priority Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Priority</Text>
              <View style={styles.chipContainer}>
                {PRIORITY_OPTIONS.map((option) => {
                  const isSelected = selectedPriorities.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        isSelected && { ...styles.chipSelected, borderColor: option.color },
                      ]}
                      onPress={() => togglePriority(option.value)}
                    >
                      <View style={[styles.chipDot, { backgroundColor: option.color }]} />
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && { ...styles.chipTextSelected, color: option.color },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Range Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date Range</Text>
              <View style={styles.dateContainer}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker('from')}
                >
                  <Text style={styles.dateLabel}>From</Text>
                  <Text style={styles.dateValue}>
                    {dateRange.from ? format(dateRange.from, 'MMM d, yyyy') : 'Select date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker('to')}>
                  <Text style={styles.dateLabel}>To</Text>
                  <Text style={styles.dateValue}>
                    {dateRange.to ? format(dateRange.to, 'MMM d, yyyy') : 'Select date'}
                  </Text>
                </TouchableOpacity>
              </View>
              {(dateRange.from || dateRange.to) && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setDateRange(undefined, undefined)}
                >
                  <Text style={styles.clearDateText}>Clear Dates</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
            </Text>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={
                showDatePicker === 'from'
                  ? dateRange.from || new Date()
                  : dateRange.to || new Date()
              }
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: isDark ? '#111827' : '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    clearButton: {
      marginRight: 16,
    },
    clearButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#EF4444',
    },
    closeButton: {
      padding: 4,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 12,
    },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
      marginBottom: 8,
    },
    optionSelected: {
      backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
    },
    optionText: {
      fontSize: 14,
      color: isDark ? '#D1D5DB' : '#374151',
    },
    optionTextSelected: {
      fontWeight: '600',
      color: '#3B82F6',
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#E5E7EB',
      gap: 6,
    },
    chipSelected: {
      backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE',
      borderColor: '#3B82F6',
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    chipText: {
      fontSize: 13,
      color: isDark ? '#D1D5DB' : '#374151',
    },
    chipTextSelected: {
      fontWeight: '600',
      color: '#3B82F6',
    },
    dateContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    dateButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#E5E7EB',
    },
    dateLabel: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginBottom: 4,
    },
    dateValue: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    clearDateButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    clearDateText: {
      fontSize: 13,
      color: '#EF4444',
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#E5E7EB',
    },
    footerText: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    applyButton: {
      backgroundColor: '#3B82F6',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
    },
    applyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

