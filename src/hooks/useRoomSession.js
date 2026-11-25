import { useEffect, useRef, useState } from 'react';
import { createSocket } from '../socket';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export function useRoomSession(roomId, token, handlersRef) {
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remotes, setRemotes] = useState([]);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [mediaError, setMediaError] = useState('');

  useEffect(() => {
    const socket = createSocket(token);
    const peers = new Map();
    socketRef.current = socket;
    peersRef.current = peers;
    let cancelled = false;

    function preview() {
      const tracks = [currentVideo(), currentAudio()].filter(Boolean);
      setLocalStream(tracks.length ? new MediaStream(tracks) : null);
    }

    function currentVideo() {
      return screenTrackRef.current || localStreamRef.current?.getVideoTracks()[0] || null;
    }

    function currentAudio() {
      return localStreamRef.current?.getAudioTracks()[0] || null;
    }

    function attach(entry) {
      const video = currentVideo();
      const audio = currentAudio();
      if (video) entry.videoSender = entry.pc.addTrack(video);
      if (audio) entry.audioSender = entry.pc.addTrack(audio);
    }

    async function sendOffer(entry, remoteId) {
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      socket.emit('signal', { to: remoteId, description: entry.pc.localDescription });
    }

    function ensurePeer(peer, initiator) {
      if (peer.user?.id && String(peer.user.id) === String(socket.user?.id)) return null;
      for (const [id, old] of peers) {
        if (id !== peer.socketId && old.user?.id && String(old.user.id) === String(peer.user?.id)) {
          old.pc.close();
          peers.delete(id);
          setRemotes((prev) => prev.filter((item) => item.socketId !== id));
        }
      }
      const existing = peers.get(peer.socketId);
      if (existing) {
        if (peer.user) existing.user = peer.user;
        setRemotes((prev) =>
          prev.map((item) => (item.socketId === peer.socketId ? { ...item, user: existing.user } : item))
        );
        return existing;
      }

      const pc = new RTCPeerConnection({ iceServers });
      const entry = { pc, user: peer.user, pending: [] };
      peers.set(peer.socketId, entry);
      attach(entry);

      pc.onicecandidate = (event) => {
        if (event.candidate) socket.emit('signal', { to: peer.socketId, candidate: event.candidate });
      };

      pc.ontrack = (event) => {
        event.track.enabled = true;
        const incoming = event.streams?.[0];
        setRemotes((prev) => {
          const previous = prev.find((item) => item.socketId === peer.socketId);
          const tracks = previous?.stream?.getTracks().filter((track) => track.id !== event.track.id) ?? [];
          const stream = incoming && incoming.getTracks().length ? incoming : new MediaStream([...tracks, event.track]);
          const next = prev.filter((item) => item.socketId !== peer.socketId && String(item.user?.id || '') !== String(entry.user?.id || 'x'));
          return [...next, { socketId: peer.socketId, user: entry.user, stream }];
        });
      };

      if (initiator) void sendOffer(entry, peer.socketId).catch((err) => console.error(err));
      return entry;
    }

    async function onSignal({ from, user, description, candidate }) {
      const entry = ensurePeer({ socketId: from, user }, false);
      if (!entry) return;
      if (description) {
        await entry.pc.setRemoteDescription(description);
        const queued = entry.pending.splice(0);
        for (const item of queued) {
          try {
            await entry.pc.addIceCandidate(item);
          } catch {
            /* ignore late candidates */
          }
        }
        if (description.type === 'offer') {
          const answer = await entry.pc.createAnswer();
          await entry.pc.setLocalDescription(answer);
          socket.emit('signal', { to: from, description: entry.pc.localDescription });
        }
      } else if (candidate) {
        if (entry.pc.remoteDescription) {
          try {
            await entry.pc.addIceCandidate(candidate);
          } catch {
            /* ignore */
          }
        } else entry.pending.push(candidate);
      }
    }

    function consider(list) {
      for (const peer of list) ensurePeer(peer, socket.id > peer.socketId);
    }

    socket.on('connect', () => socket.emit('join-room', roomId));
    socket.on('connect_error', () => handlersRef.current.onError?.('Could not connect to the room.'));
    socket.on('room-state', (state) => handlersRef.current.onState?.(state));
    socket.on('message', (message) => handlersRef.current.onMessage?.(message));
    socket.on('media', (payload) => handlersRef.current.onMedia?.(payload));
    socket.on('playback', (payload) => {
      if (payload.from === socket.id) return;
      handlersRef.current.onPlayback?.(payload);
    });
    socket.on('online', (list) => handlersRef.current.onOnline?.(list));
    socket.on('roster', (payload) => handlersRef.current.onRoster?.(payload));
    socket.on('room-closed', () => handlersRef.current.onClosed?.());
    socket.on('cue', (payload) => handlersRef.current.onCue?.(payload));
    socket.on('app-error', (payload) => handlersRef.current.onError?.(payload.message));
    socket.on('peers', consider);
    socket.on('peer-joined', (peer) => consider([peer]));
    socket.on('peer-left', ({ socketId }) => {
      peers.get(socketId)?.pc.close();
      peers.delete(socketId);
      setRemotes((prev) => prev.filter((item) => item.socketId !== socketId));
      handlersRef.current.onPeerLeft?.(socketId);
    });
    socket.on('share', (payload) => handlersRef.current.onShare?.(payload));
    socket.on('reaction', (payload) => handlersRef.current.onReaction?.(payload));
    socket.on('signal', (payload) => {
      onSignal(payload).catch((err) => console.error(err));
    });

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setAudioOn(true);
        setVideoOn(true);
        preview();
      } catch {
        if (!cancelled) {
          setMediaError('Camera and microphone are off. You can still watch and chat.');
          setAudioOn(false);
          setVideoOn(false);
        }
      }
      if (!cancelled) socket.connect();
    }

    start();

    return () => {
      cancelled = true;
      socket.emit('leave-room');
      socket.disconnect();
      peers.forEach((entry) => entry.pc.close());
      peers.clear();
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      socketRef.current = null;
    };
  }, [roomId, token, handlersRef]);

  function currentVideo() {
    return screenTrackRef.current || localStreamRef.current?.getVideoTracks()[0] || null;
  }

  function rebuildPreview() {
    const audio = localStreamRef.current?.getAudioTracks()[0] || null;
    const tracks = [currentVideo(), audio].filter(Boolean);
    setLocalStream(tracks.length ? new MediaStream(tracks) : null);
  }

  async function replaceOutgoingVideo(track) {
    const socket = socketRef.current;
    for (const [id, entry] of peersRef.current) {
      if (entry.videoSender) {
        await entry.videoSender.replaceTrack(track);
      } else if (track) {
        entry.videoSender = entry.pc.addTrack(track);
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        socket?.emit('signal', { to: id, description: entry.pc.localDescription });
      }
    }
  }

  function toggleAudio() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioOn(track.enabled);
  }

  function toggleVideo() {
    if (screenTrackRef.current) return;
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
  }

  function announceShare(sharing) {
    socketRef.current?.emit('share', { sharing });
  }

  async function stopScreen() {
    const track = screenTrackRef.current;
    if (!track) return;
    track.onended = null;
    track.stop();
    screenTrackRef.current = null;
    setSharing(false);
    announceShare(false);
    const camera = localStreamRef.current?.getVideoTracks()[0] || null;
    await replaceOutgoingVideo(camera);
    rebuildPreview();
  }

  async function toggleScreen() {
    if (screenTrackRef.current) {
      await stopScreen();
      return;
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
        selfBrowserSurface: 'exclude'
      });
      const track = display.getVideoTracks()[0];
      screenTrackRef.current = track;
      setSharing(true);
      announceShare(true);
      track.onended = () => {
        if (screenTrackRef.current !== track) return;
        stopScreen();
      };
      await replaceOutgoingVideo(track);
    } catch {
      /* picker dismissed */
    }
  }

  return {
    socketRef,
    localStream,
    remotes,
    audioOn,
    videoOn,
    sharing,
    mediaError,
    toggleAudio,
    toggleVideo,
    toggleScreen
  };
}
