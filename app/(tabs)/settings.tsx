import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Shield,
  Accessibility,
  Mic,
  Sliders,
  Server,
  Cpu,
  Lock,
  Trash2,
  Info,
  ChevronRight,
  ExternalLink,
  Terminal,
} from 'lucide-react-native';
import { settingsStore } from '../../store/settingsStore';
import { usePermissions } from '../../hooks/usePermissions';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { StorageService } from '../../services/storage';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = settingsStore.getState();
  const { accessibility, microphone, openAccessibilitySettings } = usePermissions();

  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [devMode, setDevMode] = useState(settings.devMode);
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  const handleSaveApiUrl = async () => {
    setIsSavingUrl(true);
    await settingsStore.setApiUrl(apiUrl);
    setIsSavingUrl(false);
    Alert.alert('Backend Saved', `FastAPI URL updated to:\n${apiUrl}`);
  };

  const handleToggleDevMode = async (val: boolean) => {
    setDevMode(val);
    await settingsStore.setDevMode(val);
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Delete all stored call analyses?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await StorageService.clearAllHistory();
          Alert.alert('History Cleared', 'All local call records have been deleted.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>System configuration, security thresholds, and hardware diagnostics</Text>
        </View>

        {/* Device & Permission Status Section */}
        <Text style={styles.groupHeader}>System & Permissions</Text>
        <GlassCard style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/settings/permissions' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <Accessibility size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Accessibility Service</Text>
              <Text style={styles.settingSubtitle}>
                {accessibility ? 'Enabled (Monitoring in-call UI)' : 'Disabled — Tap to configure'}
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Mic size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Microphone Access</Text>
              <Text style={styles.settingSubtitle}>{microphone ? 'Granted' : 'Denied'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Shield size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Direct Call Audio</Text>
              <Text style={styles.settingSubtitle}>
                {settings.capabilities?.directCallAudio
                  ? 'Supported'
                  : 'Restricted by Android Security (Acoustic Path Active)'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Risk Thresholds & Model */}
        <Text style={styles.groupHeader}>AI & Detection Tuning</Text>
        <GlassCard style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/settings/model' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <Cpu size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Detection Model Information</Text>
              <Text style={styles.settingSubtitle}>Wav2Vec2 Deepfake-audio-detection-V2</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRowNoAction}>
            <View style={styles.settingIcon}>
              <Sliders size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>UX Risk Categorization</Text>
              <Text style={styles.settingSubtitle}>
                0–30% Likely Real • 31–60% Inconclusive • 61–100% Possible AI
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Backend Endpoint */}
        <Text style={styles.groupHeader}>Backend Connectivity</Text>
        <GlassCard style={styles.card}>
          <View style={styles.settingRowNoAction}>
            <View style={styles.settingIcon}>
              <Server size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>FastAPI Server URL</Text>
              <Text style={styles.settingSubtitle}>
                Point to your machine IP (e.g. http://192.168.1.5:8000)
              </Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://10.0.2.2:8000"
              style={styles.textInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              title="Save"
              size="small"
              onPress={handleSaveApiUrl}
              loading={isSavingUrl}
              style={styles.saveBtn}
            />
          </View>
        </GlassCard>

        {/* Developer & Privacy */}
        <Text style={styles.groupHeader}>Privacy & Data Controls</Text>
        <GlassCard style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/settings/privacy' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <Lock size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Privacy & Data Policy</Text>
              <Text style={styles.settingSubtitle}>Learn how call audio is processed & retained</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={handleClearHistory} activeOpacity={0.7}>
            <View style={[styles.settingIcon, { backgroundColor: '#FEE2E2' }]}>
              <Trash2 size={18} color="#DC2626" />
            </View>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: '#DC2626' }]}>Clear All History</Text>
              <Text style={styles.settingSubtitle}>Permanently wipe recorded analyses</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Terminal size={18} color="#4F46E5" />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Developer Diagnostics Mode</Text>
              <Text style={styles.settingSubtitle}>Enable audio pipeline test harness</Text>
            </View>
            <Switch
              value={devMode}
              onValueChange={handleToggleDevMode}
              trackColor={{ false: '#CBD5E1', true: '#818CF8' }}
              thumbColor={devMode ? '#4F46E5' : '#F1F5F9'}
            />
          </View>

          {devMode && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => router.push('/settings/dev-test' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.settingIcon}>
                  <Terminal size={18} color="#16A34A" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Open Model Testing Suite</Text>
                  <Text style={styles.settingSubtitle}>Run audio benchmark & diagnostic tests</Text>
                </View>
                <ChevronRight size={18} color="#94A3B8" />
              </TouchableOpacity>
            </>
          )}
        </GlassCard>

        {/* About App Info */}
        <View style={styles.aboutFooter}>
          <Text style={styles.aboutText}>VoiceGuard Android v1.0.0 (Build 1)</Text>
          <Text style={styles.aboutSubText}>AI Voice Authenticity Layer for Android Devices</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  groupHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    padding: 6,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  settingRowNoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  saveBtn: {
    height: 42,
    paddingHorizontal: 16,
  },
  aboutFooter: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  aboutSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
