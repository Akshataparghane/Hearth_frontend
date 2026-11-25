import { VideoTile } from './VideoTile';

const REACTIONS = ['❤️', '😂', '😮', '👏', '🔥'];

export function CallStage({ localStream, localName, localColor, localAvatar, remotes, reactions, onReact }) {
  return (
    <section className="stage call-stage">
      <div className="call-grid">
        <VideoTile stream={localStream} muted mirror name={localName} color={localColor} avatar={localAvatar} />
        {remotes.map((remote) => (
          <VideoTile
            key={remote.socketId}
            stream={remote.stream}
            name={remote.user?.name || 'Guest'}
            color={remote.user?.color || '#8c8174'}
            avatar={remote.user?.avatar}
          />
        ))}
        <div className="reaction-layer">
          {(reactions || []).map((item) => (
            <span key={item.id} className="floater">
              {item.emoji}
            </span>
          ))}
        </div>
      </div>
      <div className="react-bar">
        {REACTIONS.map((emoji) => (
          <button key={emoji} className="ghost tiny" type="button" onClick={() => onReact?.(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    </section>
  );
}
