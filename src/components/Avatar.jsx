import { Portrait, portraitIds } from '../avatars';
import { initials } from '../media';

export function Avatar({ name = '', color = '#e8a15a', avatar = '', size = '', live = false, status = '' }) {
  const classes = ['avatar', size, live ? 'live' : ''].filter(Boolean).join(' ');
  let face;
  if (typeof avatar === 'string' && avatar.startsWith('data:image')) {
    face = (
      <span className={classes}>
        <img src={avatar} alt="" />
      </span>
    );
  } else if (portraitIds.has(avatar)) {
    face = (
      <span className={classes}>
        <Portrait id={avatar} />
      </span>
    );
  } else {
    face = (
      <span className={classes} style={{ background: color }}>
        {initials(name)}
      </span>
    );
  }
  if (status !== 'online' && status !== 'offline') return face;
  return (
    <span className="avatar-wrap">
      {face}
      <span className={`presence ${status}`} title={status === 'online' ? 'Online' : 'Offline'} />
    </span>
  );
}
