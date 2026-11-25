import { useEffect, useRef, useState } from 'react';
import { describeLink } from '../media';

const REACTIONS = ['❤️', '😂', '😮', '👏', '🔥'];

function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  });
}

function expectedTime(playback) {
  if (!playback) return 0;
  if (!playback.playing) return playback.position || 0;
  const started = new Date(playback.updatedAt).getTime();
  const elapsed = (Date.now() - started) / 1000;
  return Math.max(0, (playback.position || 0) + (Number.isFinite(elapsed) ? elapsed : 0));
}

function SharedPicture({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !stream) return undefined;
    const preview = stream.clone();
    video.srcObject = preview;
    video.play?.().catch(() => {});
    return () => {
      preview.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [stream]);
  if (!stream) return null;
  return (
    <video
      ref={ref}
      className="shared-screen"
      autoPlay
      playsInline
      muted
      controlsList="nodownload nofullscreen"
      disablePictureInPicture
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}

export function WatchStage({
  media,
  playback,
  cueAt,
  linkError,
  onPlayback,
  onCue,
  onSubmitLink,
  sharedStream,
  sharedLabel,
  youAreSharing,
  onShare,
  reactions,
  onReact
}) {
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef(null);
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const suppress = useRef(false);
  const playbackRef = useRef(playback);
  const onPlaybackRef = useRef(onPlayback);
  playbackRef.current = playback;
  onPlaybackRef.current = onPlayback;

  function apply(next) {
    if (!next) return;
    const at = expectedTime(next);
    const player = playerRef.current;
    const file = fileRef.current;
    if (media?.kind === 'youtube' && player?.getCurrentTime) {
      const playing = player.getPlayerState?.() === window.YT?.PlayerState?.PLAYING;
      if (Math.abs(player.getCurrentTime() - at) < 1.5 && playing === Boolean(next.playing)) return;
    }
    if (media?.kind === 'file' && file && Math.abs(file.currentTime - at) < 1.2 && !file.paused === Boolean(next.playing)) {
      return;
    }
    suppress.current = true;
    if (media?.kind === 'youtube' && player?.seekTo) {
      player.seekTo(at, true);
      if (next.playing) player.playVideo();
      else player.pauseVideo();
    }
    if (media?.kind === 'file' && file) {
      if (Math.abs(file.currentTime - at) > 1.2) file.currentTime = at;
      if (next.playing) file.play().catch(() => {});
      else file.pause();
    }
    window.setTimeout(() => {
      suppress.current = false;
    }, 1200);
  }

  useEffect(() => {
    if (!cueAt) return undefined;
    const tick = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(tick);
  }, [cueAt]);

  useEffect(() => {
    if (playback) apply(playback);
    // apply reads the latest media via closure; playback identity is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback?.updatedAt, playback?.playing, playback?.position, media?.kind, media?.url]);

  useEffect(() => {
    if (media?.kind !== 'youtube' || !media.youtubeId) return undefined;
    let dead = false;
    let player;
    loadYouTube().then((YT) => {
      if (dead || !mountRef.current) return;
      player = new YT.Player(mountRef.current, {
        videoId: media.youtubeId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            playerRef.current = player;
            if (playbackRef.current) apply(playbackRef.current);
          },
          onStateChange: (event) => {
            if (suppress.current || !player.getCurrentTime) return;
            const state = window.YT?.PlayerState;
            if (!state) return;
            if (event.data === state.PLAYING) {
              onPlaybackRef.current({ playing: true, position: player.getCurrentTime() });
            }
            if (event.data === state.PAUSED || event.data === state.ENDED) {
              onPlaybackRef.current({ playing: false, position: player.getCurrentTime() });
            }
          }
        }
      });
    });
    return () => {
      dead = true;
      playerRef.current = null;
      player?.destroy?.();
    };
    // mount once per video id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.youtubeId]);

  useEffect(() => {
    if (!cueAt) return undefined;
    const id = window.setTimeout(() => {
      suppress.current = true;
      if (media?.kind === 'youtube') playerRef.current?.playVideo?.();
      if (media?.kind === 'file') fileRef.current?.play().catch(() => {});
      window.setTimeout(() => {
        suppress.current = false;
      }, 900);
    }, Math.max(0, cueAt - Date.now()));
    return () => window.clearTimeout(id);
  }, [cueAt, media?.kind]);

  function emitFile(playing) {
    if (suppress.current) return;
    onPlayback({ playing, position: fileRef.current?.currentTime || 0 });
  }

  const secondsLeft = cueAt ? Math.ceil((cueAt - now) / 1000) : 0;
  const showCue = Boolean(cueAt && secondsLeft > 0);
  const platform = media?.kind === 'link' ? describeLink(media.url) : '';

  return (
    <section className="stage">
      <div className="stage-frame">
        <SharedPicture stream={sharedStream} />
        {sharedLabel ? <p className="share-label">{sharedLabel}</p> : null}
        <div className="reaction-layer">
          {(reactions || []).map((item) => (
            <span key={item.id} className="floater">
              {item.emoji}
            </span>
          ))}
        </div>
        {media?.kind === 'youtube' && !sharedStream && <div ref={mountRef} className="yt-box" />}
        {media?.kind === 'file' && !sharedStream && (
          <video
            ref={fileRef}
            src={media.url}
            controls
            controlsList="nodownload"
            disablePictureInPicture
            onContextMenu={(event) => event.preventDefault()}
            playsInline
            onPlay={() => emitFile(true)}
            onPause={() => emitFile(false)}
            onSeeked={() => emitFile(!fileRef.current?.paused)}
          />
        )}
        {youAreSharing && !sharedStream && (
          <div className="link-card">
            <p className="eyebrow">Sharing</p>
            <h2>Others can see your screen</h2>
            <p>
              Your side stays on this card so the shared picture does not turn black. Choose the Netflix or
              browser window, not this Hearth tab.
            </p>
            <button className="ghost" type="button" onClick={onShare}>
              Stop sharing
            </button>
          </div>
        )}
        {media?.kind === 'link' && !sharedStream && !youAreSharing && (
          <div className="link-card">
            <p className="eyebrow">{platform}</p>
            <h2>Watch {platform} together</h2>
            <p>
              Both of you already see this card. Netflix and Prime will not play their video inside Hearth.
              Share the window and the picture shows here for everyone, while you talk on the mic and chat.
            </p>
            <div className="link-actions">
              <button className="primary" type="button" onClick={onShare}>
                Share the window
              </button>
              <a className="ghost" href={media.url} target="_blank" rel="noreferrer">
                Open {platform}
              </a>
            </div>
          </div>
        )}
        {!media && (
          <div className="link-card">
            <p className="eyebrow">Now showing</p>
            <h2>Put something on</h2>
            <p>
              Paste a YouTube link or a video file to watch it here in sync. For Netflix, Prime, and other
              apps, paste the title link and open it together.
            </p>
          </div>
        )}
        {showCue && (
          <div className="cue-overlay">
            <strong>{secondsLeft}</strong>
            <span>{media?.kind === 'link' ? `Press play on ${platform}` : 'Starting together'}</span>
          </div>
        )}
      </div>

      <form
        className="link-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) onSubmitLink(draft.trim());
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="YouTube, video file, Netflix, Prime…"
          aria-label="Link to watch"
        />
        <button className="primary" type="submit">
          Put it on
        </button>
        <button className="ghost" type="button" onClick={onCue}>
          Cue in 3
        </button>
        <button className="ghost" type="button" onClick={onShare}>
          {youAreSharing ? 'Stop sharing' : 'Share screen'}
        </button>
      </form>
      <div className="react-bar">
        {REACTIONS.map((emoji) => (
          <button key={emoji} className="ghost tiny" type="button" onClick={() => onReact?.(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
      {linkError ? <p className="form-error">{linkError}</p> : null}
    </section>
  );
}
