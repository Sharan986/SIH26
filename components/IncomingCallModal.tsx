import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useWebRTC } from '../contexts/WebRTCContext';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function IncomingCallModal() {
    const { callState, callerId, acceptCall, rejectCall } = useWebRTC();
    const router = useRouter();

    if (callState !== 'ringing' || !callerId) {
        return null;
    }

    const handleAccept = () => {
        acceptCall();
        router.push(`/call/${callerId}`);
    };

    return (
        <Modal transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Incoming Call</Text>
                    <Text style={styles.callerId}>{callerId}</Text>
                    
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.button, styles.rejectButton]} 
                            onPress={rejectCall}
                        >
                            <PhoneOff size={32} color="#FFFFFF" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.button, styles.acceptButton]} 
                            onPress={handleAccept}
                        >
                            <Phone size={32} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-start',
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    container: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    title: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    callerId: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 32,
    },
    actions: {
        flexDirection: 'row',
        gap: 32,
    },
    button: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rejectButton: {
        backgroundColor: '#EF4444',
    },
    acceptButton: {
        backgroundColor: '#10B981',
    },
});
