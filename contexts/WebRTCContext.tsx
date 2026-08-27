import React, { createContext, useContext, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import { audioStreamProcessor } from '../services/audioStreamProcessor';
import { settingsStore } from '../store/settingsStore';
import { analysisStore } from '../store/analysisStore';
import { useRouter } from 'expo-router';

export type CallState = 'idle' | 'ringing' | 'connected' | 'ended';

// Use minimal STUN since SFU will provide its own host candidates
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

interface WebRTCContextType {
    clientId: string;
    setClientId: (id: string) => void;
    connectSignaling: (id: string) => void;
    callState: CallState;
    callerId: string | null;
    receiverId: string | null;
    localStream: any | null;
    remoteStream: any | null;
    startCall: (targetId: string) => Promise<boolean>;
    acceptCall: () => void;
    rejectCall: () => void;
    endCall: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const router = useRouter();
    const [clientId, setClientId] = useState<string>('');
    const [callState, setCallState] = useState<CallState>('idle');
    const [callerId, setCallerId] = useState<string | null>(null);
    const [receiverId, setReceiverId] = useState<string | null>(null);
    const [localStream, setLocalStream] = useState<any | null>(null);
    const [remoteStream, setRemoteStream] = useState<any | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const timerRef = useRef<any>(null);

    const callerIdRef = useRef<string | null>(null);
    const receiverIdRef = useRef<string | null>(null);

    const getSignalingUrl = () => {
        const apiUrl = settingsStore.getState().apiUrl || 'http://localhost:8000';
        return apiUrl.replace(/^http/, 'ws') + '/ws/sfu';
    };

    const sendSignalingMessage = (message: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    };

    const setupPCListeners = (pc: RTCPeerConnection) => {
        pc.onicecandidate = (event: any) => {
            if (event.candidate) {
                // SFU doesn't strictly need trickle ICE, but sending just in case
                sendSignalingMessage({
                    type: 'sfu:ice-candidate',
                    candidate: event.candidate,
                });
            }
        };

        pc.ontrack = (event: any) => {
            console.log('[WebRTC SFU] Received remote track');
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
                audioStreamProcessor.start(event.streams[0]);
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log('[WebRTC SFU] ICE Connection State:', state);
            if (state === 'connected' || state === 'completed') {
                console.log('[WebRTC SFU] ✅ ICE Connected to SFU!');
                setCallState('connected');
                
                // Trigger Scam Prevention UI directly (SFU handles audio processing)
                if (!analysisStore.getState().isAnalyzing) {
                    analysisStore.startSession(`webrtc_${Date.now()}`);
                    analysisStore.setWsStatus('CONNECTED', 'Connected to SFU AI');
                    analysisStore.setScreenState('PROCESSING');
                    
                    const startTime = Date.now();
                    timerRef.current = setInterval(() => {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        analysisStore.setState({ callDurationSec: elapsed, analysisDurationSec: elapsed });
                    }, 1000);

                    router.push('/live' as any);
                }
            } else if (state === 'failed' || state === 'closed') {
                cleanupCall();
            }
        };
    };

    const setupLocalStream = async (pc: RTCPeerConnection): Promise<any | null> => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                return null;
            }
        }
        try {
            const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);
            stream.getTracks().forEach((track: any) => {
                pc.addTrack(track, stream);
            });
            return stream;
        } catch (e) {
            console.error('[WebRTC SFU] Failed to get local stream', e);
            return null;
        }
    };

    const connectSignaling = (id: string) => {
        if (wsRef.current) wsRef.current.close();
        setClientId(id);

        const url = `${getSignalingUrl()}/${id}`;
        console.log('[WebRTC SFU] Connecting to', url);
        
        const ws = new WebSocket(url);
        ws.onopen = () => console.log('[WebRTC SFU] Connected as', id);
        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                await handleSignalingMessage(data);
            } catch (e) {
                console.error('[WebRTC SFU] Failed to parse signaling message', e);
            }
        };
        ws.onerror = (e) => console.error('[WebRTC SFU] Signaling error', e);
        ws.onclose = () => console.log('[WebRTC SFU] Signaling disconnected');
        wsRef.current = ws;
    };

    const handleSignalingMessage = async (data: any) => {
        const { type, caller, sdp } = data;

        if (type === 'sfu:incoming') {
            console.log('[WebRTC SFU] Incoming call from', caller);
            callerIdRef.current = caller;
            setCallerId(caller);
            setCallState('ringing');
        }
        else if (type === 'sfu:accepted') {
            console.log('[WebRTC SFU] Call accepted, negotiating with SFU');
            const pc = new RTCPeerConnection(ICE_SERVERS);
            setupPCListeners(pc);
            pcRef.current = pc;
            
            const stream = await setupLocalStream(pc);
            if (!stream) {
                cleanupCall();
                return;
            }

            try {
                const offer = await pc.createOffer({});
                await pc.setLocalDescription(offer);
                sendSignalingMessage({
                    type: 'sfu:offer',
                    sdp: offer
                });
            } catch (e) {
                console.error('[WebRTC SFU] Error creating offer', e);
                cleanupCall();
            }
        }
        else if (type === 'sfu:answer') {
            console.log('[WebRTC SFU] Received SFU answer');
            if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        }
        else if (type === 'sfu:renegotiate') {
            console.log('[WebRTC SFU] Received SFU renegotiation offer (downlink ready)');
            if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pcRef.current.createAnswer();
                await pcRef.current.setLocalDescription(answer);
                sendSignalingMessage({
                    type: 'sfu:answer',
                    sdp: answer
                });
            }
        }
        else if (type === 'sfu:ended' || type === 'sfu:reject') {
            cleanupCall();
        }
        else if (type === 'sfu:prediction') {
            // Forward AI prediction from SFU directly to UI!
            analysisStore.addPrediction(data);
            analysisStore.setAudioLevel(data.rms, data.rms * 100);
        }
    };

    const startCall = async (targetId: string): Promise<boolean> => {
        receiverIdRef.current = targetId;
        setReceiverId(targetId);
        sendSignalingMessage({ type: 'sfu:dial', target: targetId });
        setCallState('connected'); // Optimistic
        return true;
    };

    const acceptCall = async () => {
        const caller = callerIdRef.current;
        if (!caller) return;
        sendSignalingMessage({ type: 'sfu:accept', caller });
        setCallState('connected');
    };

    const rejectCall = () => {
        sendSignalingMessage({ type: 'sfu:reject' });
        cleanupCall();
    };

    const endCall = () => {
        sendSignalingMessage({ type: 'sfu:end' });
        cleanupCall();
    };

    const cleanupCall = async () => {
        setCallState('idle');
        callerIdRef.current = null;
        receiverIdRef.current = null;
        setCallerId(null);
        setReceiverId(null);

        if (localStream) {
            localStream.getTracks().forEach((t: any) => t.stop());
            setLocalStream(null);
        }
        setRemoteStream(null);

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        audioStreamProcessor.stop();

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (analysisStore.getState().isAnalyzing) {
            const summary = await analysisStore.finishSession('WebRTC SFU');
            if (summary) {
                router.replace({
                    pathname: '/live/result',
                    params: { summaryId: summary.id },
                } as any);
            }
        }
    };

    return (
        <WebRTCContext.Provider value={{
            clientId,
            setClientId,
            connectSignaling,
            callState,
            callerId,
            receiverId,
            localStream,
            remoteStream,
            startCall,
            acceptCall,
            rejectCall,
            endCall,
        }}>
            {children}
        </WebRTCContext.Provider>
    );
};

export const useWebRTC = () => {
    const context = useContext(WebRTCContext);
    if (!context) throw new Error('useWebRTC must be used within WebRTCProvider');
    return context;
};

