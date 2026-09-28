import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Users } from 'lucide-react';
import { useAuthStore } from '../../modules/kernel/store/authStore';
import { pagesPourUtilisateur } from '../navigation';
import { listCourriers } from '../../modules/courrier/api/courrierApi';
import { listStagiaires } from '../../modules/stagiaires/api/stagiairesApi';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { identiteCourrier } from '../../modules/courrier/utils/receptionCourrier';

const DELAI_DEBOUNCE_MS = 250;
const LONGUEUR_MIN_RECHERCHE_DISTANTE = 2;

function normaliser(valeur) {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Ctrl+K (ou Cmd+K sur mac) partout dans l'espace applicatif interne —
 * jamais sur le portail public, qui n'a pas de compte ni de dossier à
 * chercher. Cherche sur trois sources à la fois : les pages de la sidebar
 * (filtrage local, instantané), les courriers et les stagiaires (requête
 * réseau, débattue et annulable) — chacune respecte déjà le périmètre de
 * visibilité de l'utilisateur côté backend, aucun filtrage supplémentaire
 * à faire ici.
 */
export function CommandPalette({ open, onClose }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [requete, setRequete] = useState('');
  const [courriers, setCourriers] = useState([]);
  const [stagiaires, setStagiaires] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [surlignee, setSurlignee] = useState(0);
  const inputRef = useRef(null);
  const conteneurRef = useFocusTrap(open);

  const pages = useMemo(() => pagesPourUtilisateur(user), [user]);

  const pagesFiltrees = useMemo(() => {
    if (!requete.trim()) return [];
    const q = normaliser(requete);
    return pages.filter((p) => normaliser(p.label).includes(q) || (p.section && normaliser(p.section).includes(q)));
  }, [pages, requete]);

  useEffect(() => {
    if (!open) return;
    setRequete('');
    setCourriers([]);
    setStagiaires([]);
    setSurlignee(0);
    // Le focus trap place déjà le focus sur le premier élément focusable du
    // conteneur ; celui-ci est justement le champ de recherche.
  }, [open]);

  useEffect(() => {
    if (!open || requete.trim().length < LONGUEUR_MIN_RECHERCHE_DISTANTE) {
      setCourriers([]);
      setStagiaires([]);
      return undefined;
    }

    const controleur = new AbortController();
    setChargement(true);
    const minuteur = setTimeout(() => {
      Promise.allSettled([
        listCourriers({ recherche: requete, par_page: 5 }, controleur.signal),
        listStagiaires({ recherche: requete, par_page: 5 }, controleur.signal),
      ])
        .then(([resCourriers, resStagiaires]) => {
          if (controleur.signal.aborted) return;
          setCourriers(resCourriers.status === 'fulfilled' ? (resCourriers.value.data ?? []).slice(0, 5) : []);
          setStagiaires(resStagiaires.status === 'fulfilled' ? (resStagiaires.value.data ?? []).slice(0, 5) : []);
        })
        .finally(() => {
          if (!controleur.signal.aborted) setChargement(false);
        });
    }, DELAI_DEBOUNCE_MS);

    return () => {
      clearTimeout(minuteur);
      controleur.abort();
    };
  }, [requete, open]);

  const resultats = useMemo(
    () => [
      ...pagesFiltrees.map((p) => ({ type: 'page', key: `page-${p.to}`, to: p.to, titre: p.label, sousTitre: p.section })),
      ...courriers.map((c) => ({
        type: 'courrier',
        key: `courrier-${c.id}`,
        to: `/courriers/${c.id}`,
        titre: c.objet,
        sousTitre: `${identiteCourrier(c)} · ${c.statut_label}`,
      })),
      ...stagiaires.map((s) => ({
        type: 'stagiaire',
        key: `stagiaire-${s.id}`,
        to: `/stagiaires/${s.id}`,
        titre: s.nom,
        sousTitre: s.statut_label,
      })),
    ],
    [pagesFiltrees, courriers, stagiaires],
  );

  useEffect(() => {
    setSurlignee(0);
  }, [resultats.length]);

  function allerA(to) {
    navigate(to);
    onClose();
  }

  function surTouche(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSurlignee((i) => Math.min(i + 1, resultats.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSurlignee((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cible = resultats[surlignee];
      if (cible) allerA(cible.to);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  const groupes = [
    { titre: 'Pages', icone: Search, items: resultats.filter((r) => r.type === 'page') },
    { titre: 'Courriers', icone: FileText, items: resultats.filter((r) => r.type === 'courrier') },
    { titre: 'Stagiaires', icone: Users, items: resultats.filter((r) => r.type === 'stagiaire') },
  ].filter((g) => g.items.length > 0);

  let indexGlobal = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Rechercher">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div ref={conteneurRef} className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-modal border border-border-strong bg-surface-raised shadow-raised">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={18} className="shrink-0 text-text-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={surTouche}
            placeholder="Rechercher un courrier, un stagiaire, une page…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-subtle focus:outline-none"
            aria-label="Rechercher"
            aria-activedescendant={resultats[surlignee] ? resultats[surlignee].key : undefined}
            role="combobox"
            aria-expanded={resultats.length > 0}
            aria-controls="palette-resultats"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] text-text-subtle sm:block">Échap</kbd>
        </div>

        <div id="palette-resultats" role="listbox" className="max-h-96 overflow-y-auto py-2">
          {requete.trim().length > 0 && requete.trim().length < LONGUEUR_MIN_RECHERCHE_DISTANTE && groupes.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-subtle">Continuez à taper pour chercher un dossier ou un stagiaire.</p>
          )}
          {requete.trim() && chargement && groupes.length === 0 && <p className="px-4 py-6 text-center text-sm text-text-subtle">Recherche…</p>}
          {requete.trim() && !chargement && groupes.length === 0 && requete.trim().length >= LONGUEUR_MIN_RECHERCHE_DISTANTE && (
            <p className="px-4 py-6 text-center text-sm text-text-subtle">Aucun résultat pour « {requete} ».</p>
          )}
          {!requete.trim() && <p className="px-4 py-6 text-center text-sm text-text-subtle">Tapez pour rechercher, ou utilisez les flèches puis Entrée.</p>}

          {groupes.map((groupe) => (
            <div key={groupe.titre} className="mb-1 last:mb-0">
              <p className="px-4 pb-1 pt-2 text-2xs font-semibold uppercase tracking-[0.08em] text-text-subtle">{groupe.titre}</p>
              {groupe.items.map((item) => {
                indexGlobal += 1;
                const actif = indexGlobal === surlignee;
                const Icone = groupe.icone;
                return (
                  <button
                    key={item.key}
                    id={item.key}
                    type="button"
                    role="option"
                    aria-selected={actif}
                    onMouseEnter={() => setSurlignee(indexGlobal)}
                    onClick={() => allerA(item.to)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${actif ? 'bg-ont-blue-700 text-white' : 'text-text hover:bg-surface-sunken'}`}
                  >
                    <Icone size={16} className={`shrink-0 ${actif ? 'text-white' : 'text-text-subtle'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.titre}</span>
                      {item.sousTitre && <span className={`block truncate text-xs ${actif ? 'text-ont-blue-100' : 'text-text-subtle'}`}>{item.sousTitre}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
