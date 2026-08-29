import { Component } from 'react';
import { Button } from './ui/Button';
import { OntLogo } from './ui/OntLogo';

/**
 * Filet de secours pour une erreur JavaScript non gérée dans l'arbre des
 * routes applicatives : sans lui, React démonte toute l'application sur
 * une page blanche à la moindre exception de rendu. Un identifiant
 * d'erreur (horodatage + aléa) est affiché pour permettre de retrouver
 * l'incident dans les journaux du navigateur sans jamais exposer la trace
 * technique elle-même à l'écran.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null, identifiant: null };
  }

  static getDerivedStateFromError(erreur) {
    const identifiant = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    return { erreur, identifiant };
  }

  componentDidCatch(erreur, info) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary ${this.state.identifiant}]`, erreur, info.componentStack);
  }

  render() {
    if (!this.state.erreur) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <OntLogo className="mx-auto mb-4 h-12 w-12" />
          <h1 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-50">
            Une erreur inattendue est survenue
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            L'application a rencontré un problème. Rechargez la page ; si le problème persiste, signalez-le en
            indiquant la référence ci-dessous.
          </p>
          <p className="mt-3 font-mono text-xs text-slate-400 dark:text-slate-500">Référence : {this.state.identifiant}</p>
          <Button type="button" className="mt-6 w-full" onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </div>
      </div>
    );
  }
}
