import { Link } from 'react-router-dom';

export function Brand() {
  return (
    <Link to="/" className="brand">
      <span className="brand-mark" aria-hidden="true" />
      Hearth
    </Link>
  );
}

export function AuthFrame({ title, lede, children, footer }) {
  return (
    <main className="auth">
      <section className="auth-story">
        <Brand />
        <div>
          <p className="eyebrow">Private screening</p>
          <h2>
            Same scene.
            <br />
            Different
            <br />
            sofas.
          </h2>
          <p>
            Call the people you actually watch with. YouTube stays in sync inside the room. Netflix, Prime, and the rest open on each person&apos;s own account while you stay on the line.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <h1>{title}</h1>
        <p className="lede">{lede}</p>
        {children}
        {footer}
      </section>
    </main>
  );
}
