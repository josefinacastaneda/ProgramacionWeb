'use client';

// El "óvalo": switch deslizable entre los dos mundos de la colección.
//   Night → Drop 01 · Night Out
//   Day   → Drop 02 · Cruddo
//
// Es un <button role="switch"> real: funciona con teclado (Enter/Espacio) y
// anuncia su estado. Los íconos son SVG de línea dibujados a mano, sin emojis.

export type Mundo = 'night' | 'day';

function IconoLuna() {
  return (
    <svg
      className="toggle-icono"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
    </svg>
  );
}

function IconoSol() {
  return (
    <svg
      className="toggle-icono"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
    </svg>
  );
}

export default function ToggleMundo({
  mundo,
  onCambiar,
  id,
}: {
  mundo: Mundo;
  onCambiar: (m: Mundo) => void;
  id?: string;
}) {
  const esNoche = mundo === 'night';
  return (
    <div className="toggle-wrap">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={!esNoche}
        aria-label={
          esNoche
            ? 'Mundo Night, Drop 01. Cambiar a Day, Drop 02'
            : 'Mundo Day, Drop 02. Cambiar a Night, Drop 01'
        }
        className={`toggle-ovalo${esNoche ? ' es-night' : ' es-day'}`}
        onClick={() => onCambiar(esNoche ? 'day' : 'night')}
      >
        {/* La perilla que se desliza. */}
        <span className="toggle-perilla" aria-hidden="true" />

        <span className="toggle-lado toggle-lado-night" aria-hidden="true">
          <IconoLuna />
          <span className="toggle-texto">Night</span>
        </span>

        <span className="toggle-lado toggle-lado-day" aria-hidden="true">
          <span className="toggle-texto">Day</span>
          <IconoSol />
        </span>
      </button>
    </div>
  );
}
