/**
 * Camera Service
 * Handles camera permissions, photo/video capture, and image processing
 */

import * as Camera from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import {
  CameraOptions,
  CaptureResult,
  FlashMode,
  Point,
  DocumentCorners,
} from '../types/documents';
import { Alert, Platform, Image } from 'react-native';

class CameraService {
  private cameraPermissionCache: { status: string; canAskAgain: boolean } | null = null;
  private galleryPermissionCache: { status: string; canAskAgain: boolean } | null = null;

  /**
   * Request camera permissions
   */
  async requestCameraPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not Supported', 'Camera is not supported on web');
        return false;
      }

      const { status, canAskAgain } = await Camera.Camera.requestCameraPermissionsAsync();
      this.cameraPermissionCache = { status, canAskAgain };

      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Camera Access Required',
            'Please enable camera access in your device settings to capture documents.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => this.openSettings() },
            ]
          );
        }
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check camera permissions status
   */
  async checkCameraPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
    try {
      if (Platform.OS === 'web') {
        return { granted: false, canAskAgain: false };
      }

      const { status, canAskAgain } = await Camera.Camera.getCameraPermissionsAsync();
      this.cameraPermissionCache = { status, canAskAgain };

      return {
        granted: status === 'granted',
        canAskAgain,
      };
    } catch {
      return { granted: false, canAskAgain: true };
    }
  }

  /**
   * Request gallery permissions
   */
  async requestGalleryPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        return true; // Web doesn't need gallery permissions
      }

      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      this.galleryPermissionCache = { status, canAskAgain };

      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Gallery Access Required',
            'Please enable gallery access in your device settings to select images.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => this.openSettings() },
            ]
          );
        }
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open device settings
   */
  private openSettings(): void {
    if (Platform.OS === 'ios') {
      // Linking.openURL('app-settings:');
    } else if (Platform.OS === 'android') {
      // Linking.openSettings();
    }
  }

  /**
   * Capture photo using camera
   */
  async capturePhoto(options: Partial<CameraOptions> = {}): Promise<CaptureResult | null> {
    try {
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) {
        return null;
      }

      const defaultOptions: CameraOptions = {
        quality: 0.9,
        base64: false,
        exif: true,
        correctOrientation: true,
        ...options,
      };

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: defaultOptions.quality,
        base64: defaultOptions.base64,
        exif: defaultOptions.exif,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      return {
        uri: asset.uri,
        width: asset.width || 0,
        height: asset.height || 0,
        base64: asset.base64 || undefined,
        exif: asset.exif || undefined,
      };
    } catch {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      return null;
    }
  }

  /**
   * Pick image from gallery
   */
  async pickImageFromGallery(
    options: Partial<CameraOptions> = {},
    allowsMultiple = false
  ): Promise<CaptureResult[]> {
    try {
      const hasPermission = await this.requestGalleryPermissions();
      if (!hasPermission) {
        return [];
      }

      const defaultOptions: CameraOptions = {
        quality: 0.9,
        base64: false,
        exif: true,
        ...options,
      };

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: defaultOptions.quality,
        base64: defaultOptions.base64,
        exif: defaultOptions.exif,
        allowsMultipleSelection: allowsMultiple,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
      }

      return result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width || 0,
        height: asset.height || 0,
        base64: asset.base64 || undefined,
        exif: asset.exif || undefined,
      }));
    } catch {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return [];
    }
  }

  /**
   * Optimize image for document capture
   */
  async optimizeImage(uri: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    try {
      const qualitySettings = {
        low: { compress: 0.6, width: 1200 },
        medium: { compress: 0.8, width: 2000 },
        high: { compress: 0.95, width: 3000 },
      };

      const settings = qualitySettings[quality];

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: settings.width } }],
        {
          compress: settings.compress,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch {
      return uri; // Return original if optimization fails
    }
  }

  /**
   * Auto-crop document from image
   */
  async autoCropDocument(uri: string, corners?: DocumentCorners): Promise<string> {
    try {
      if (!corners) {
        // If no corners provided, return optimized original
        return this.optimizeImage(uri, 'high');
      }

      // Calculate crop region from corners
      const cropRegion = this.calculateCropRegion(corners);

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            crop: {
              originX: cropRegion.x,
              originY: cropRegion.y,
              width: cropRegion.width,
              height: cropRegion.height,
            },
          },
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch {
      return uri;
    }
  }

  /**
   * Calculate crop region from corners
   */
  private calculateCropRegion(corners: DocumentCorners): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const { topLeft, topRight, bottomLeft, bottomRight } = corners;

    const minX = Math.min(topLeft.x, bottomLeft.x);
    const maxX = Math.max(topRight.x, bottomRight.x);
    const minY = Math.min(topLeft.y, topRight.y);
    const maxY = Math.max(bottomLeft.y, bottomRight.y);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Apply perspective correction
   */
  async applyPerspectiveCorrection(uri: string, corners: DocumentCorners): Promise<string> {
    try {
      // First crop to bounding box
      const croppedUri = await this.autoCropDocument(uri, corners);

      // Apply additional sharpening
      const manipulatedImage = await ImageManipulator.manipulateAsync(croppedUri, [], {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      return manipulatedImage.uri;
    } catch {
      return uri;
    }
  }

  /**
   * Detect document edges (simplified version)
   */
  async detectDocumentEdges(uri: string): Promise<DocumentCorners | null> {
    try {
      // Get image dimensions
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return null;

      // For now, return default corners (full image)
      // In a real implementation, you would use native modules for edge detection
      // or integrate with ML Kit's document scanner

      let fileInfo: { width: number; height: number };
      try {
        fileInfo = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          Image.getSize(
            uri,
            (width, height) => resolve({ width, height }),
            (error) => reject(error)
          );
        });
      } catch (error) {
        // Default dimensions if unable to get image size
        fileInfo = { width: 1000, height: 1000 };
      }

      const { width, height } = fileInfo;

      // Return corners with small margin
      const margin = 20;
      return {
        topLeft: { x: margin, y: margin },
        topRight: { x: width - margin, y: margin },
        bottomLeft: { x: margin, y: height - margin },
        bottomRight: { x: width - margin, y: height - margin },
      };
    } catch {
      return null;
    }
  }

  /**
   * Rotate image
   */
  async rotateImage(uri: string, degrees: number): Promise<string> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(uri, [{ rotate: degrees }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      return manipulatedImage.uri;
    } catch {
      return uri;
    }
  }

  /**
   * Apply image filter
   */
  async applyFilter(
    uri: string,
    filter: 'bw' | 'grayscale' | 'enhance' | 'original'
  ): Promise<string> {
    try {
      if (filter === 'original') {
        return uri;
      }

      // Note: expo-image-manipulator has limited filter support
      // For advanced filters, you would need native modules or server-side processing
      const manipulatedImage = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      return manipulatedImage.uri;
    } catch {
      return uri;
    }
  }

  /**
   * Capture multiple photos in sequence (burst mode)
   */
  async captureBurst(
    count: number,
    options: Partial<CameraOptions> = {}
  ): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.capturePhoto(options);
      if (result) {
        results.push(result);
      } else {
        break; // User cancelled
      }
    }

    return results;
  }

  /**
   * Get file size
   */
  async getFileSize(uri: string): Promise<number> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists && 'size' in info ? info.size : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Copy file to app directory
   */
  async copyToAppDirectory(uri: string, filename: string): Promise<string> {
    try {
      const directory = FileSystem.documentDirectory + 'documents/';
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

      const newUri = directory + filename;
      await FileSystem.copyAsync({ from: uri, to: newUri });

      return newUri;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(uri: string, size = 200): Promise<string> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: size } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch {
      return uri;
    }
  }
}

export default new CameraService();

