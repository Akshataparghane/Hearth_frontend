import { useEffect, useRef, useState } from 'react';
import { Avatar } from './Avatar';

export function VideoTile({ stream, muted, mirror, name, color, avatar }) {
  const ref = useRef(null);
  const audioRef = useRef(null);
  const [showing, setShowing] = useState(false);
  const trackKey = stream?.getVideoTracks().map((track) => `${track.id}:${track.readyState}`).join('|') || '';

  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    setShowing(false);
    if (!stream) {
      video.srcObject = null;
      return undefined;
    }
    video.srcObject = stream;
    if (!muted && audioRef.current) audioRef.current.srcObject = stream;
    const play = () => video.play?.().catch(() => {});
    play();
    audioRef.current?.play?.().catch(() => {});
    const onPlaying = () => setShowing(true);
    video.addEventListener('playing', onPlaying);
    const tracks = stream.getVideoTracks();
    tracks.forEach((track) => track.addEventListener('unmute', play));
    return () => {
      video.removeEventListener('playing', onPlaying);
      tracks.forEach((track) => track.removeEventListener('unmute', play));
    };
  }, [stream, trackKey, muted]);

  return (
    <article className="tile">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        disablePictureInPicture
        onContextMenu={(event) => event.preventDefault()}
        className={mirror ? 'mirror' : ''}
      />
      {!muted ? <audio ref={audioRef} autoPlay /> : null}
      {!showing && (
        <div className="tile-fallback">
          <Avatar name={name} color={color} avatar={avatar} />
        </div>
      )}
      <span>{name}</span>
    </article>
  );
}
