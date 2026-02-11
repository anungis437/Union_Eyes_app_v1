import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FilterOption {
  label: string;
  value: string;
}

interface FilterOptions {
  [key: string]: FilterOption[];
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: { [key: string]: string };
  filterOptions: FilterOptions;
  onApply: (filters: { [key: string]: string }) => void;
}

export function FilterSheet({
  visible,
  onClose,
  filters,
  filterOptions,
  onApply,
}: FilterSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [localFilters, setLocalFilters] = React.useState(filters);
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 100,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    const resetFilters = Object.keys(localFilters).reduce(
      (acc, key) => {
        acc[key] = filterOptions[key]?.[0]?.value || 'all';
        return acc;
      },
      {} as { [key: string]: string }
    );
    setLocalFilters(resetFilters);
  };

  const handleSelectFilter = (filterKey: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [filterKey]: value }));
  };

  const styles = createStyles(isDark);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Options */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {Object.entries(filterOptions).map(([filterKey, options]) => (
              <View key={filterKey} style={styles.filterGroup}>
                <Text style={styles.filterLabel}>
                  {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
                </Text>
                <View style={styles.optionsGrid}>
                  {options.map((option) => {
                    const isSelected = localFilters[filterKey] === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                        onPress={() => handleSelectFilter(filterKey, option.value)}
                        activeOpacity={0.7}
                      >
                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.applyButton]}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: SCREEN_HEIGHT * 0.85,
      paddingBottom: 20,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    resetButton: {
      fontSize: 16,
      fontWeight: '600',
      color: '#3B82F6',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 8,
    },
    filterGroup: {
      marginBottom: 24,
    },
    filterLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
      marginBottom: 12,
    },
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    optionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
      borderWidth: 1,
      borderColor: 'transparent',
      gap: 6,
    },
    optionChipSelected: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    optionText: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    optionTextSelected: {
      color: '#fff',
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#374151' : '#E5E7EB',
    },
    actionButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#111827',
    },
    applyButton: {
      backgroundColor: '#3B82F6',
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },
  });

