import React, { useState, useCallback, useMemo } from 'react';
import {
  Image,
  View,
  ActivityIndicator,
  StyleSheet,
  ImageStyle,
  ViewStyle,
} from 'react-native';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  priority?: 'low' | 'normal' | 'high';
  lazy?: boolean;
}

// Global image loading queue to limit concurrent loads
class ImageLoadingQueue {
  private queue: Array<() => void> = [];
  private activeLoads = 0;
  private readonly maxConcurrentLoads = 10;

  enqueue(loadFunction: () => void) {
    if (this.activeLoads < this.maxConcurrentLoads) {
      this.activeLoads++;
      loadFunction();
    } else {
      this.queue.push(loadFunction);
    }
  }

  dequeue() {
    this.activeLoads--;
    if (this.queue.length > 0) {
      const nextLoad = this.queue.shift();
      if (nextLoad) {
        this.activeLoads++;
        nextLoad();
      }
    }
  }
}

const imageQueue = new ImageLoadingQueue();

// Simple in-memory cache for loaded images
const imageCache = new Map<string, boolean>();

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  containerStyle,
  placeholder,
  fallback,
  resizeMode = 'cover',
  priority = 'normal',
  lazy = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);

  const imageUri = useMemo(() => {
    return typeof source === 'object' && 'uri' in source ? source.uri : null;
  }, [source]);

  const isCached = useMemo(() => {
    return imageUri ? imageCache.has(imageUri) : false;
  }, [imageUri]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    if (imageUri) {
      imageCache.set(imageUri, true);
    }
    imageQueue.dequeue();
  }, [imageUri]);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    imageQueue.dequeue();
  }, []);

  const startLoading = useCallback(() => {
    if (!shouldLoad && !error) {
      setShouldLoad(true);
    }
  }, [shouldLoad, error]);

  // Render placeholder while loading
  const renderPlaceholder = useCallback(() => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" color="#ccc" />
      </View>
    );
  }, [placeholder, style]);

  // Render fallback on error
  const renderFallback = useCallback(() => {
    if (fallback) {
      return fallback;
    }

    return (
      <View style={[styles.fallback, style]}>
        <View style={styles.fallbackIcon} />
      </View>
    );
  }, [fallback, style]);

  // Handle lazy loading trigger
  const handleLayout = useCallback(() => {
    if (lazy && !shouldLoad && !error) {
      // Simple lazy loading - load when component is laid out
      startLoading();
    }
  }, [lazy, shouldLoad, error, startLoading]);

  // If it's a local image (number), render directly
  if (typeof source === 'number') {
    return (
      <View style={containerStyle}>
        <Image source={source} style={style} resizeMode={resizeMode} />
      </View>
    );
  }

  // If there's an error, show fallback
  if (error) {
    return <View style={containerStyle}>{renderFallback()}</View>;
  }

  // If not ready to load, show placeholder
  if (!shouldLoad) {
    return (
      <View style={containerStyle} onLayout={handleLayout}>
        {renderPlaceholder()}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {loading && renderPlaceholder()}
      <Image
        source={source}
        style={[style, loading && styles.hidden]}
        resizeMode={resizeMode}
        onLoad={() => {
          if (isCached) {
            handleLoad();
          } else {
            imageQueue.enqueue(handleLoad);
          }
        }}
        onError={handleError}
        onLayout={lazy ? handleLayout : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
    minWidth: 50,
  },
  fallback: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
    minWidth: 50,
  },
  fallbackIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#ccc',
    borderRadius: 4,
  },
  hidden: {
    opacity: 0,
  },
});

export default OptimizedImage;
