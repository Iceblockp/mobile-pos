import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import helloAnimation from '@/assets/animations/Hello.json';

interface SplashScreenProps {
  onAnimationFinish?: () => void;
}

const { width, height } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationFinish,
}) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    // Auto-play the animation when component mounts
    animationRef.current?.play();
  }, []);

  const handleAnimationFinish = () => {
    if (onAnimationFinish) {
      onAnimationFinish();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#2563EB" />
      <LottieView
        ref={animationRef}
        source={helloAnimation}
        style={styles.animation}
        autoPlay
        loop={false}
        onAnimationFinish={handleAnimationFinish}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: Math.min(width * 0.8, 400),
    height: Math.min(height * 0.6, 400),
  },
});
