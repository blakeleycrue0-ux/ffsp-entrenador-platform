/**
 * Iconos de este producto, dibujados a mano.
 * ---------------------------------------------------------------------------
 * El resto de la interfaz usa lucide, que está bien para lo genérico — buscar,
 * cerrar, una flecha. Pero cuando las cosas propias del producto (la pizarra,
 * la plantilla, un partido, el pase de lista) se dibujan también con formas
 * prestadas, todo acaba pareciendo el panel de administración de cualquier
 * otra cosa. Un cuadrado con puntos no es una pizarra táctica.
 *
 * Éstos son de fútbol: un campo con su círculo central, un silbato, una bota,
 * una camiseta, un cono, un balón. Comparten rejilla de 24, trazo de 1,7 y
 * `currentColor`, para que convivan con lucide sin que se note el salto.
 */

import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: string | number };

const Base = ({ size = 18, children, ...rest }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...rest}
    /* El trazo va DESPUÉS de `rest` a propósito: estos dibujos están hechos
       para 1,7 y con otro grosor se emborronan. Quien los use no tiene que
       acordarse de eso. */
    strokeWidth={1.7}
  >
    {children}
  </svg>
);

/** Campo completo: para la pizarra táctica. */
export const IconoCampo = (p: Props) => (
  <Base {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" />
    <path d="M12 4.5v15" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M2.5 9h2.6v6H2.5M21.5 9h-2.6v6h2.6" />
  </Base>
);

/** Camiseta con dorsal: la plantilla. */
export const IconoCamiseta = (p: Props) => (
  <Base {...p}>
    <path d="M9 3.5 6 5 3.2 7.2l2 2.6L7 8.6V20a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V8.6l1.8 1.2 2-2.6L18 5l-3-1.5" />
    <path d="M9 3.5a3 3 0 0 0 6 0" />
  </Base>
);

/**
 * Silbato: entrenamientos y pase de lista.
 * El primer intento era una curva suelta que a 17 píxeles no se entendía. Un
 * icono que hay que adivinar no es un icono. Éste es lo que es un silbato:
 * cuerpo redondo con su agujero, boquilla a un lado y anilla arriba.
 */
export const IconoSilbato = (p: Props) => (
  <Base {...p}>
    <circle cx="9.5" cy="14" r="5.2" />
    <circle cx="9.5" cy="14" r="1.4" />
    <path d="M14.5 12.2h5.8a1 1 0 0 1 1 1v1.6a1 1 0 0 1-1 1h-5.8" />
    <path d="M7.6 9.1a2.1 2.1 0 0 1 3.8 0" />
  </Base>
);

/**
 * Balón: partidos.
 * Aquí había una bota, y a este tamaño se leía como una bandera. Para «hay
 * partido» no hay símbolo más directo que un balón.
 */
export const IconoBalon = (p: Props) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="m12 7.3 3.9 2.8-1.5 4.6H9.6L8.1 10.1z" />
    <path d="M12 3.4v3.9M20.1 9.6l-4.2 1.4M17 19.6l-2.6-3.6M7 19.6l2.6-3.6M3.9 9.6l4.2 1.4" />
  </Base>
);

/** Cono: biblioteca de ejercicios. */
export const IconoCono = (p: Props) => (
  <Base {...p}>
    <path d="M12 3.5 18.5 18h-13z" />
    <path d="M9.1 11.5h5.8M7.6 15h8.8" />
    <path d="M3.5 20.5h17" />
  </Base>
);

/** Banquillo con personas: el cuerpo técnico. */
export const IconoCuerpoTecnico = (p: Props) => (
  <Base {...p}>
    <circle cx="8" cy="7" r="2.6" />
    <path d="M3.2 17.5a4.8 4.8 0 0 1 9.6 0" />
    <circle cx="17" cy="8.5" r="2.1" />
    <path d="M14.2 17.5a3.9 3.9 0 0 1 6.6-2.8" />
  </Base>
);

/** Gráfica de barras con línea de campo: analíticas. */
export const IconoAnaliticas = (p: Props) => (
  <Base {...p}>
    <path d="M3.5 20.5h17" />
    <rect x="5" y="12" width="3.4" height="6" rx="0.8" />
    <rect x="10.3" y="7.5" width="3.4" height="10.5" rx="0.8" />
    <rect x="15.6" y="10" width="3.4" height="8" rx="0.8" />
  </Base>
);

/** Parte médica: disponibilidad y lesiones. */
export const IconoParteMedico = (p: Props) => (
  <Base {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="2" />
    <path d="M12 8.6v6.3M8.9 11.7h6.2" />
  </Base>
);
