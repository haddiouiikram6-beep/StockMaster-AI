import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuthStore } from '../src/store/useAuthStore';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const { isAuthenticated, isLoading } = useAuthStore();

  const player = useVideoPlayer(require('../assets/Create_splash_screen_intro.mp4'), (player) => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    // Wait until Expo Router is mounted
    if (!rootNavigationState?.key) return;

    // Do nothing if auth is still loading
    if (isLoading) return;

    // Show the splash video for 4 seconds, then redirect
    const timeout = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, [isLoading, isAuthenticated, rootNavigationState?.key]);

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.responsiveVideo}
        player={player}
        nativeControls={false}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responsiveVideo: {
    width: '100%',
    height: '100%',
    maxWidth: width,
    maxHeight: height,
  },
});
