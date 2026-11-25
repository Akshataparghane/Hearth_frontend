import { Portrait, suggestedPortraits } from '../avatars';

export function AvatarPicker({ gender, value, onChange }) {
  const choices = suggestedPortraits(gender);
  return (
    <div className="avatar-picker" role="listbox" aria-label="Profile picture">
      {choices.map((item) => (
        <button
          key={item.id}
          type="button"
          className={value === item.id ? 'face on' : 'face'}
          aria-label={item.name}
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          <Portrait id={item.id} />
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  );
}

export function readProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      canvas.getContext('2d').drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That picture could not be read.'));
    };
    image.src = url;
  });
}
