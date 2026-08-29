import React, { createContext, useContext, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import { audioStreamProcessor } from '../services/audioStreamProcessor';
import { settingsStore } from '../store/settingsStore';
import { analysisStore } from '../store/analysisStore';
import { AnalysisService } from '../services/analysisService';
import { useRouter } from 'expo-router';

export type CallState = 'idle' | 'ringing' | 'connected' | 'ended';

// STUN + TURN servers to traverse strict NATs (CGNAT on mobile/long-distance)
// Multiple TURN providers for redundancy — the first one to respond wins.
const ICE_SERVERS = {
    iceServers: [
        // STUN — fast, no relay, works for non-symmetric NAT
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        // OpenRelay TURN — UDP port 80 (most permissive)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        // OpenRelay TURN — UDP port 443
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        // OpenRelay TURN — TCP port 443 (bypasses UDP blocks on strict mobile networks)
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        // Backup TURN via relay.metered.ca (same provider, different hostname)
        {
            urls: 'turn:relay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:relay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
    // Pre-gather ICE candidates in background to reduce connection time
    iceCandidatePoolSize: 10,
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
    
    // Store incoming offer until accepted
    const incomingOfferRef = useRef<any>(null);

    const callerIdRef = useRef<string | null>(null);
    const receiverIdRef = useRef<string | null>(null);

    const getSignalingUrl = () => {
        const apiUrl = settingsStore.getState().apiUrl || 'http://localhost:8000';
        return apiUrl.replace(/^http/, 'ws') + '/ws/signaling';
    };

    const sendSignalingMessage = (message: any) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    };

    const getSessionId = () => {
        const id1 = clientId;
        const id2 = callerIdRef.current || receiverIdRef.current;
        if (!id2) return `call_${Date.now()}`;
        return `call_${[id1, id2].sort().join('_')}`;
    };

    const startHybridAnalysis = () => {
        if (!analysisStore.getState().isAnalyzing) {
            const sessionId = getSessionId();
            AnalysisService.start(sessionId, clientId);
        }
    };

    const setupPCListeners = (pc: RTCPeerConnection) => {
        pc.onicecandidate = (event: any) => {
            if (event.candidate) {
                const target = callerIdRef.current || receiverIdRef.current;
                sendSignalingMessage({
                    type: 'call:ice-candidate',
                    target: target,
                    candidate: event.candidate,
                });
            }
        };

        pc.ontrack = (event: any) => {
            console.log('[WebRTC P2P] Received remote track');
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
                // We no longer send the remote stream to audioStreamProcessor,
                // because each client sends their own local mic audio via WebSocket.
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log('[WebRTC P2P] ICE Connection State:', state);
            if (state === 'connected' || state === 'completed') {
                console.log('[WebRTC P2P] ✅ ICE Connected!');
                setCallState('connected');
                
                // Start the WebSocket AI analysis when P2P connects
                startHybridAnalysis();
                router.push('/live' as any);
                
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
            console.error('[WebRTC P2P] Failed to get local stream', e);
            return null;
        }
    };

    const connectSignaling = (id: string) => {
        if (wsRef.current) wsRef.current.close();
        setClientId(id);

        const url = `${getSignalingUrl()}/${id}`;
        console.log('[WebRTC P2P] Connecting to', url);
        
        const ws = new WebSocket(url);
        ws.onopen = () => console.log('[WebRTC P2P] Connected as', id);
        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                await handleSignalingMessage(data);
            } catch (e) {
                console.error('[WebRTC P2P] Failed to parse signaling message', e);
            }
        };
        ws.onerror = (e) => console.error('[WebRTC P2P] Signaling error', e);
        ws.onclose = () => console.log('[WebRTC P2P] Signaling disconnected');
        wsRef.current = ws;
    };

    const handleSignalingMessage = async (data: any) => {
        const { type, sender, sdp, candidate } = data;

        if (type === 'call:offer') {
            console.log('[WebRTC P2P] Incoming call offer from', sender);
            callerIdRef.current = sender;
            setCallerId(sender);
            incomingOfferRef.current = sdp;
            setCallState('ringing');
        }
        else if (type === 'call:answer') {
            console.log('[WebRTC P2P] Received answer from', sender);
            if (pcRef.current) {
                await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            }
        }
        else if (type === 'call:ice-candidate') {
            if (pcRef.current && candidate) {
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error('[WebRTC P2P] Error adding ICE candidate', e);
                }
            }
        }
        else if (type === 'call:ended' || type === 'call:reject') {
            cleanupCall();
        }
    };

    const startCall = async (targetId: string): Promise<boolean> => {
        receiverIdRef.current = targetId;
        setReceiverId(targetId);
        setCallState('connected'); // Optimistic
        
        const pc = new RTCPeerConnection(ICE_SERVERS);
        setupPCListeners(pc);
        pcRef.current = pc;
        
        const stream = await setupLocalStream(pc);
        if (!stream) {
            cleanupCall();
            return false;
        }

        try {
            const offer = await pc.createOffer({});
            await pc.setLocalDescription(offer);
            sendSignalingMessage({
                type: 'call:offer',
                target: targetId,
                sdp: offer
            });
            return true;
        } catch (e) {
            console.error('[WebRTC P2P] Error creating offer', e);
            cleanupCall();
            return false;
        }
    };

    const acceptCall = async () => {
        const caller = callerIdRef.current;
        if (!caller || !incomingOfferRef.current) return;
        setCallState('connected');

        const pc = new RTCPeerConnection(ICE_SERVERS);
        setupPCListeners(pc);
        pcRef.current = pc;
        
        const stream = await setupLocalStream(pc);
        if (!stream) {
            cleanupCall();
            return;
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignalingMessage({
                type: 'call:answer',
                target: caller,
                sdp: answer
            });
        } catch (e) {
            console.error('[WebRTC P2P] Error creating answer', e);
            cleanupCall();
        }
    };

    const rejectCall = () => {
        const caller = callerIdRef.current;
        if (caller) {
            sendSignalingMessage({ type: 'call:reject', target: caller });
        }
        cleanupCall();
    };

    const endCall = () => {
        const target = callerIdRef.current || receiverIdRef.current;
        if (target) {
            sendSignalingMessage({ type: 'call:end', target: target });
        }
        cleanupCall();
    };

    const cleanupCall = async () => {
        setCallState('idle');
        callerIdRef.current = null;
        receiverIdRef.current = null;
        incomingOfferRef.current = null;
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

        if (analysisStore.getState().isAnalyzing) {
            AnalysisService.stop();
            // Optional: navigate to result screen
            // router.replace(...) is handled if needed
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

