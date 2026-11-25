import { useState } from 'react';
import { Icon } from './Icon';

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required = true
}) {
  const [shown, setShown] = useState(false);

  return (
    <label>
      <span className="field-label">
        <Icon name="lock" size={16} />
        {label}
      </span>
      <span className="password-field">
        <input
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          minLength={minLength}
          required={required}
        />
        <button
          className="ghost tiny icon-button"
          type="button"
          onClick={() => setShown((current) => !current)}
          aria-label={shown ? 'Hide password' : 'Show password'}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} />
        </button>
      </span>
    </label>
  );
}
