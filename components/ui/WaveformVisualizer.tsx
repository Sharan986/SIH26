import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

interface WaveformVisualizerProps {
  rms: number; // Current RMS energy 0.0 to 1.0
  barCount?: number;
  height?: number;
  activeColor?: string;
  isCapturing?: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  rms,
  barCount = 28,
  height = 54,
  activeColor = '#4F46E5',
  isCapturing = true,
}) => {
  const [history, setHistory] = useState<number[]>(() => new Array(barCount).fill(0.1));

  useEffect(() => {
    if (!isCapturing) {
      setHistory(new Array(barCount).fill(0.08));
      return;
    }

    // Scale RMS with dynamic non-linear curve for natural vocal speech visualization
    const normalized = Math.min(Math.max(rms * 4.5, 0.1), 1.0);
    // Add small random acoustic jitter for realistic bar variation
    const jittered = normalized * (0.8 + (Math.sin(Date.now() / 150) * 0.2));

    setHistory((prev) => {
      const next = [...prev.slice(1), jittered];
      return next;
    });
  }, [rms, isCapturing, barCount]);

  return (
    <View style={[styles.container, { height }]}>
      {history.map((val, idx) => {
        const barHeight = Math.max(val * height, 4);
        const opacity = isCapturing ? 0.35 + (idx / barCount) * 0.65 : 0.2;
        return (
          <View
            key={idx}
            style={[
              styles.bar,
              {
                height: barHeight,
                backgroundColor: activeColor,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  bar: {
    width: 3.5,
    borderRadius: 3,
  },
});
