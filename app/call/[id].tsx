import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWebRTC } from '../../contexts/WebRTCContext';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react-native';
// In standard setup, react-native-webrtc provides RTCView, but we just need audio for the POC.
// We will still import RTCView in case it's needed for the stream to bind to the audio session.
import { RTCView } from 'react-native-webrtc';

export default function CallScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { callState, endCall, remoteStream, localStream } = useWebRTC();
    
    const [timer, setTimer] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callState === 'connected') {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [callState]);

    useEffect(() => {
        if (callState === 'idle') {
            router.back();
        }
    }, [callState, router]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach((track: any) => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.statusText}>
                    {callState === 'ringing' ? 'Calling...' : 'Connected'}
                </Text>
                <Text style={styles.targetId}>{id}</Text>
                {callState === 'connected' && (
                    <Text style={styles.timer}>{formatTime(timer)}</Text>
                )}
            </View>

            {/* Render local and remote streams in RTCView to force audio lifecycle binding */}
            <View style={{ width: 0, height: 0 }}>
                {localStream && (
                    <RTCView streamURL={localStream.toURL()} style={{ width: 0, height: 0 }} />
                )}
                {remoteStream && (
                    <RTCView streamURL={remoteStream.toURL()} style={{ width: 0, height: 0 }} />
                )}
            </View>

            <View style={styles.controls}>
                <View style={styles.topControls}>
                    <TouchableOpacity 
                        style={[styles.iconButton, isMuted && styles.iconButtonActive]} 
                        onPress={toggleMute}
                    >
                        {isMuted ? <MicOff color="#FFFFFF" /> : <Mic color="#FFFFFF" />}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.iconButton, isSpeaker && styles.iconButtonActive]} 
                        onPress={() => setIsSpeaker(!isSpeaker)}
                    >
                        {isSpeaker ? <Volume2 color="#FFFFFF" /> : <VolumeX color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.endButton} onPress={() => {
                    endCall();
                    router.back();
                }}>
                    <PhoneOff size={32} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'space-between',
        paddingVertical: 60,
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
    },
    statusText: {
        color: '#94A3B8',
        fontSize: 18,
        marginBottom: 8,
    },
    targetId: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    timer: {
        color: '#94A3B8',
        fontSize: 16,
    },
    controls: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    topControls: {
        flexDirection: 'row',
        gap: 32,
        marginBottom: 60,
    },
    iconButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    endButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
