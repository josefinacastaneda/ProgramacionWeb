'use client';

// El "óvalo": filtro de la colección por mundo.
//   Night → Drop - 01 : NIGHT OUT
//   Day   → Drop - 02 : CRUDDO
//   todo  → los dos drops en un solo scroll (de la noche al día)
//
// Funciona como un filtro más: tocar el lado que YA está activo lo deselecciona
// y vuelve a la colección completa. Por eso son dos botones reales (uno por
// lado) y no un switch de dos estados: hay tres estados posibles.

export type Mundo = 'night' | 'day';
export type SeleccionMundo = Mundo | 'todo';

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
  seleccion,
  onElegir,
}: {
  seleccion: SeleccionMundo;
  onElegir: (lado: Mundo) => void;
}) {
  return (
    <div className="toggle-wrap">
      <div
        className={`toggle-ovalo es-${seleccion}`}
        role="group"
        aria-label="Filtrar la colección por drop"
      >
        {/* Perilla: se corre al lado activo. Con "todo" se desvanece. */}
        <span className="toggle-perilla" aria-hidden="true" />

        <button
          type="button"
          className="toggle-lado toggle-lado-night"
          aria-pressed={seleccion === 'night'}
          aria-label="Night, Drop 01 Night Out"
          onClick={() => onElegir('night')}
        >
          <IconoLuna />
          <span className="toggle-texto">Night</span>
        </button>

        <button
          type="button"
          className="toggle-lado toggle-lado-day"
          aria-pressed={seleccion === 'day'}
          aria-label="Day, Drop 02 Cruddo"
          onClick={() => onElegir('day')}
        >
          <span className="toggle-texto">Day</span>
          <IconoSol />
        </button>
      </div>
    </div>
  );
}
