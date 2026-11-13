'use client';

import {useEffect, useRef, useState} from 'react';
import type {CallState} from '@/lib/calls';
import {useVisiblePolling} from './hooks';
import {PhoneIcon, VideoCallIcon} from './icons';
import styles from './messages.module.css';

const ICE: RTCConfiguration = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]};
// shortcut: the other person only sees the ring while this chat is open, upgrade when calls have their own screen.

export function CallButtons({conversationId, viewerId}: {conversationId: number; viewerId: number}) {
  const [call, setCall] = useState<CallState | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seenIce = useRef(new Set<string>());
  const queuedIce = useRef<string[]>([]);
  const remoteReady = useRef(false);
  const appliedAnswer = useRef(false);
  const sawCall = useRef(false);

  const post = (body: Record<string, unknown>) =>
    fetch(`/api/conversations/${conversationId}/call`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(body),
    });

  const hangupLocal = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach(track => track.stop());
    localRef.current = null;
    remoteRef.current = null;
    remoteReady.current = false;
    appliedAnswer.current = false;
    queuedIce.current = [];
    seenIce.current.clear();
  };

  useEffect(() => () => hangupLocal(), []);

  const play = (stream: MediaStream) => {
    remoteRef.current = stream;
    if (audioRef.current) audioRef.current.srcObject = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const flushIce = (rows: {from: number; candidate: string}[]) => {
    const pc = pcRef.current;
    for (const row of rows) {
      if (row.from === viewerId || seenIce.current.has(row.candidate)) continue;
      if (!pc || !remoteReady.current) {
        if (!queuedIce.current.includes(row.candidate)) queuedIce.current.push(row.candidate);
        continue;
      }
      seenIce.current.add(row.candidate);
      try {
        void pc.addIceCandidate(JSON.parse(row.candidate) as RTCIceCandidateInit).catch(() => {});
      } catch {
        /* a bad candidate should not drop the call */
      }
    }
  };

  const attach = (pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = event => {
      if (event.candidate) void post({type: 'ice', candidate: JSON.stringify(event.candidate)});
    };
    pc.ontrack = event => play(event.streams[0]);
  };

  useVisiblePolling(async () => {
    const res = await fetch(`/api/conversations/${conversationId}/call`, {cache: 'no-store'});
    if (!res.ok) return;
    const data = (await res.json()) as {call: CallState | null};
    setCall(data.call);
  }, 2000);

  useEffect(() => {
    if (call) sawCall.current = true;
    else if (sawCall.current) {
      sawCall.current = false;
      hangupLocal();
    }
  }, [call]);

  useEffect(() => {
    const pc = pcRef.current;
    if (!call || !pc) return;
    if (videoRef.current && remoteRef.current) videoRef.current.srcObject = remoteRef.current;
    if (call.answer && !appliedAnswer.current && pc.signalingState === 'have-local-offer') {
      appliedAnswer.current = true;
      void pc.setRemoteDescription({type: 'answer', sdp: call.answer}).then(() => {
        remoteReady.current = true;
        const queued = queuedIce.current.splice(0);
        flushIce([...queued.map(candidate => ({from: -1, candidate})), ...call.ice]);
      });
      return;
    }
    flushIce(call.ice);
  }, [call, viewerId]);

  const start = async (mode: 'voice' | 'video') => {
    if (busy || call) return;
    setBusy(true);
    setNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: mode === 'video'});
      localRef.current = stream;
      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      attach(pc, stream);
      const offer = await pc.createOffer();
      if (!offer.sdp) throw new Error('no offer');
      await pc.setLocalDescription(offer);
      void audioRef.current?.play().catch(() => {});
      const res = await post({type: 'start', mode, offer: offer.sdp, id: crypto.randomUUID()});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        hangupLocal();
        setNote(data.error || 'Could not start the call');
      } else {
        setCall(data.call ?? null);
      }
    } catch {
      hangupLocal();
      setNote('Allow the microphone to place a call.');
    } finally {
      setBusy(false);
    }
  };

  const answer = async () => {
    if (!call || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: call.mode === 'video'});
      localRef.current = stream;
      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      attach(pc, stream);
      await pc.setRemoteDescription({type: 'offer', sdp: call.offer});
      remoteReady.current = true;
      flushIce(call.ice);
      const reply = await pc.createAnswer();
      if (!reply.sdp) throw new Error('no answer');
      await pc.setLocalDescription(reply);
      void audioRef.current?.play().catch(() => {});
      const res = await post({type: 'answer', answer: reply.sdp});
      if (!res.ok) {
        hangupLocal();
        setNote('That call ended');
      }
    } catch {
      hangupLocal();
      setNote('Allow the microphone to answer.');
    } finally {
      setBusy(false);
    }
  };

  const end = async () => {
    hangupLocal();
    sawCall.current = false;
    setCall(null);
    setNote(null);
    await post({type: 'end'});
  };

  const incoming = Boolean(call && call.from !== viewerId && call.phase === 'ringing' && !pcRef.current);
  const status = note ?? (incoming ? 'Incoming call' : call && !call.answer ? 'Calling…' : call ? 'Connected' : '');

  return (
    <>
      <button type="button" className={styles.iconBtn} aria-label="Start a voice call" disabled={busy} onClick={() => start('voice')}>
        <PhoneIcon size={20} />
      </button>
      <button type="button" className={styles.iconBtn} aria-label="Start a video call" disabled={busy} onClick={() => start('video')}>
        <VideoCallIcon size={20} />
      </button>
      <audio ref={audioRef} autoPlay />
      {(call || note) && (
        <div className={styles.callSheet} role="dialog" aria-label="Call">
          {call?.mode === 'video' && <video ref={videoRef} className={styles.callVideo} autoPlay playsInline muted={false} />}
          <p className={styles.callStatus}>{status}</p>
          <div className={styles.callActions}>
            {incoming && (
              <button type="button" className="fb-btn-primary" onClick={answer} disabled={busy}>Answer</button>
            )}
            <button type="button" className={styles.callEnd} onClick={end}>Hang up</button>
          </div>
        </div>
      )}
    </>
  );
}
