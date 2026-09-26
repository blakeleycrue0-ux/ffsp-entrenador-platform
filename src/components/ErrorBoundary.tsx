/**
 * La red de seguridad de la aplicación.
 * ---------------------------------------------------------------------------
 * Sin esto, un solo fallo al pintar cualquier pantalla deja a React sin árbol y
 * el navegador se queda EN BLANCO: ni mensaje, ni menú, ni forma de volver.
 * Pasó de verdad — una jugadora con un estado de disponibilidad que el código
 * no conocía tumbaba la plantilla entera — y desde fuera es indistinguible de
 * «la aplicación no carga».
 *
 * Lo que se enseña aquí no disimula el fallo: dice que ha sido cosa nuestra,
 * deja volver a intentarlo sin perder la sesión y enseña el detalle técnico
 * para quien lo quiera copiar y pegarnos. Nada de «algo ha salido mal».
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Cambia entre pantallas: al navegar se reintenta solo. */
  resetKey?: string;
  /** Qué se estaba mirando, para que el aviso sea concreto. */
  donde?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Queda en la consola del navegador para poder investigarlo.
    console.error('Fallo al pintar la interfaz', error, info.componentStack);
  }

  componentDidUpdate(anterior: Props) {
    // Al cambiar de pantalla se vuelve a intentar: el fallo puede ser de una sola.
    if (this.state.error && anterior.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-lg border border-line bg-white p-6 shadow-card">
          <p className="eyebrow text-bad">Fallo nuestro</p>
          <h1 className="mt-1.5 text-xl font-semibold text-navy-900">
            Esta pantalla no se ha podido dibujar
          </h1>
          <p className="mt-2 text-base leading-relaxed text-navy-700">
            No has hecho nada mal y no se ha perdido nada de lo que tengas guardado
            {this.props.donde ? ` en ${this.props.donde}` : ''}. Vuelve a intentarlo; si sigue
            igual, cuéntanoslo desde <strong>Ajustes → Ayuda</strong> y pega el detalle de abajo.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-md bg-navy-900 px-3.5 py-2 text-base font-medium text-white transition-colors hover:bg-navy-800"
            >
              Volver a intentarlo
            </button>
            <button
              onClick={() => window.location.assign('/app')}
              className="rounded-md border border-line px-3.5 py-2 text-base font-medium text-navy-800 transition-colors hover:bg-surface"
            >
              Ir al inicio
            </button>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted hover:text-navy-900">
              Detalle técnico
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-surface p-3 text-xs leading-relaxed text-navy-700">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
