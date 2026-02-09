import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ViewStyle } from 'react-native';

interface ProgressBarProps {
  steps: string[];
  currentStep: number;
  style?: ViewStyle;
}

export function ProgressBar({ steps, currentStep, style }: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const styles = createStyles(isDark);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <React.Fragment key={step}>
              <View style={styles.stepWrapper}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
                    isUpcoming && styles.stepCircleUpcoming,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      (isCompleted || isCurrent) && styles.stepNumberActive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelCurrent,
                    isUpcoming && styles.stepLabelUpcoming,
                  ]}
                >
                  {step}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      backgroundColor: isDark ? '#1F2937' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#E5E7EB',
    },
    stepsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepWrapper: {
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    stepCircleUpcoming: {
      backgroundColor: 'transparent',
      borderColor: isDark ? '#4B5563' : '#D1D5DB',
    },
    stepCircleCurrent: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    stepCircleCompleted: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    stepNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    stepNumberActive: {
      color: '#fff',
    },
    stepLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
      textAlign: 'center',
    },
    stepLabelCurrent: {
      color: '#3B82F6',
    },
    stepLabelUpcoming: {
      color: isDark ? '#6B7280' : '#9CA3AF',
    },
    stepLine: {
      height: 2,
      flex: 1,
      backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
      marginHorizontal: 8,
      marginBottom: 32,
    },
    stepLineCompleted: {
      backgroundColor: '#10B981',
    },
  });
