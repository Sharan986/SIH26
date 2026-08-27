import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function DialerScreen() {
    const { clientId, setClientId, connectSignaling, startCall } = useWebRTC();
    const [targetId, setTargetId] = useState('');
    const router = useRouter();

    const handleConnect = () => {
        if (clientId.trim()) {
            connectSignaling(clientId.trim());
        }
    };

    const handleCall = async () => {
        if (targetId.trim()) {
            const success = await startCall(targetId.trim());
            if (success) {
                router.push(`/call/${targetId.trim()}`);
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>VoIP Dialer</Text>
            
            <View style={styles.card}>
                <Text style={styles.label}>My Caller ID</Text>
                <TextInput
                    style={styles.input}
                    value={clientId}
                    onChangeText={setClientId}
                    placeholder="Enter your ID (e.g. user1)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                />
                <TouchableOpacity style={styles.secondaryButton} onPress={handleConnect}>
                    <Text style={styles.secondaryButtonText}>Connect to Server</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Call Target ID</Text>
                <TextInput
                    style={styles.input}
                    value={targetId}
                    onChangeText={setTargetId}
                    placeholder="Enter receiver's ID (e.g. user2)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                />
                <TouchableOpacity 
                    style={[styles.primaryButton, !targetId && styles.disabledButton]} 
                    onPress={handleCall}
                    disabled={!targetId}
                >
                    <Phone size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Start Call</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0F172A',
        marginTop: 60,
        marginBottom: 32,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#0F172A',
        marginBottom: 16,
    },
    primaryButton: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    }
});
