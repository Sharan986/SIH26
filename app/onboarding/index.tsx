import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, Activity, Lock, ArrowRight, Check } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';

const { width } = Dimensions.get('window');

export default function OnboardingIndexScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const slides = [
    {
      icon: <ShieldCheck size={52} color="#4F46E5" />,
      title: 'Meet VoiceGuard',
      subtitle:
        'Analyze voices during supported phone calls and detect signals associated with AI-generated speech.',
      buttonText: 'Get Started',
    },
    {
      icon: <Activity size={52} color="#4F46E5" />,
      title: 'Live Voice Analysis',
      subtitle:
        'VoiceGuard analyzes short voice windows while your call is active in real time.',
      buttonText: 'Next',
    },
    {
      icon: <Lock size={52} color="#4F46E5" />,
      title: 'Android Access',
      subtitle:
        'VoiceGuard requires Android system access to determine whether supported call audio can be analyzed.',
      buttonText: 'Continue to Setup',
    },
  ];

  const currentSlide = slides[step];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      router.push('/onboarding/permissions' as any);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step ? styles.activeDot : i < step ? styles.completedDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>{currentSlide.icon}</View>

        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
      </View>

      <View style={styles.footer}>
        <Button
          title={currentSlide.buttonText}
          onPress={handleNext}
          size="large"
          icon={<ArrowRight size={18} color="#FFFFFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 28,
    backgroundColor: '#4F46E5',
  },
  completedDot: {
    width: 14,
    backgroundColor: '#818CF8',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
});
