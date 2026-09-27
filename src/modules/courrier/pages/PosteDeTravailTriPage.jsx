import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Inbox, ListFilter } from 'lucide-react';
import {
  accuserReception,
  accuserReceptionBordereauLot,
  creerBordereauLot,
  getCourriersEnSouffrance,
  listCourriers,
  transmettreAvisDg,
  transmettreDepuisClasseur,
  transmettreTri,
} from '../api/courrierApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { useRequete } from '../../../shared/hooks/useRequete';
import { useToast } from '../../../shared/components/ui/Toast';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { PosteDeTravail } from '../components/poste-de-travail/PosteDeTravail';
import { AideRaccourcis } from '../components/poste-de-travail/AideRaccourcis';
import { useRaccourcisClavier } from '../components/poste-de-travail/useRaccourcisClavier';
import { useEtatTravailPersistant } from '../components/poste-de-travail/useEtatTravailPersistant';
import { DEGRE_URGENCE_LABELS } from '../constants';

const BANNETTES_CONFIG = [
  { id: 'nouveaux', label: 'Nouveaux', icone: Inbox, tone: 'info' },
  { id: 'a_trier', label: 'À trier', icone: ListFilter, tone: 'warning' },
  { id: 'classeur', label: "Classeur d'attente", icone: Archive, tone: 'neutral' },
];

const RACCOURCIS_SPECIFIQUES = [
  { touche: 'u', description: "Trier directement en urgent (bannette « À trier »)" },
];

/**
 * Écran de tri du Secrétariat 01 — premier écran PosteDeTravail (voir
 * docs/questions-ont.md), modèle des huit autres. Trois bannettes reflètent
 * exactement les trois arrêts du dossier avant l'avis DG : nouveaux
 * courriers reçus (recu), file de tri (en_attente_tri), et classeur
 * d'attente (en_attente_classeur, lot assistants).
 */
export function PosteDeTravailTriPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [pages, setPages] = useState({ nouveaux: 1, a_trier: 1, classeur: 1 });

  // Trois appels filtrés par statut, plutôt qu'un seul listCourriers({})
  // non filtré : /courriers pagine à 20 résultats triés par date de
  // création, tous statuts confondus — un dossier ancien resté à trier
  // serait invisible derrière des courriers plus récents déjà enregistrés.
  // Chaque bannette dispose désormais de sa propre pagination.
  const { donnees: reponseNouveaux, recharger: rechargerNouveaux } = useRequete(
    (signal) => listCourriers({ statut: 'recu', necessite_avis_dg: 1, page: pages.nouveaux }, signal),
    [pages.nouveaux],
  );
  const { donnees: reponseATrier, recharger: rechargerATrier } = useRequete(
    (signal) => listCourriers({ statut: 'en_attente_tri', page: pages.a_trier }, signal),
    [pages.a_trier],
  );
  const { donnees: reponseClasseur, recharger: rechargerClasseur } = useRequete(
    (signal) => listCourriers({ statut: 'en_attente_classeur', page: pages.classeur }, signal),
    [pages.classeur],
  );
  const { donnees: enSouffranceListe, recharger: rechargerSouffrance } = useRequete((signal) => getCourriersEnSouffrance(signal), []);

  const recharger = useCallback(() => {
    rechargerNouveaux();
    rechargerATrier();
    rechargerClasseur();
  }, [rechargerNouveaux, rechargerATrier, rechargerClasseur]);

  const [etatTravail, setEtatTravail] = useEtatTravailPersistant(`poste-de-travail:tri:${user.id}`, {
    bannette: 'nouveaux',
    dossierId: null,
  });
  // Retirés de façon optimiste dès le clic (voir executerDiffere) — avant
  // même que l'action réelle ne parte, 8 secondes plus tard (voir
  // toastStore.pousserDiffere) : un agent qui enchaîne les dossiers ne doit
  // pas revoir un dossier déjà traité pendant qu'il attend l'expiration.
  const [enAttenteDepart, setEnAttenteDepart] = useState(() => new Set());
  const [selectionLot, setSelectionLot] = useState(() => new Set());
  const [panneauTri, setPanneauTri] = useState(null); // { dossier } | null
  const [degreChoisi, setDegreChoisi] = useState('normal');
  const [aideOuverte, setAideOuverte] = useState(false);
  const [bordereauEnCours, setBordereauEnCours] = useState(false);

  const enSouffranceParId = useMemo(() => {
    const carte = new Map();
    (enSouffranceListe ?? []).forEach((ligne) => carte.set(ligne.courrier.id, ligne.niveau));
    return carte;
  }, [enSouffranceListe]);

  const parBannette = useMemo(() => {
    const parId = (a, b) => a.id - b.id;
    const filtrer = (liste, predicat) => (liste ?? []).filter((c) => !enAttenteDepart.has(c.id) && (!predicat || predicat(c))).sort(parId);
    return {
      // necessite_avis_dg exclut le circuit court (direction vers
      // direction, enregistré directement par le Secrétariat 02) — jamais
      // trié par le Secrétariat 01.
      nouveaux: filtrer(reponseNouveaux?.meta?.current_page === pages.nouveaux ? reponseNouveaux.data : [], (c) => c.necessite_avis_dg),
      a_trier: filtrer(reponseATrier?.meta?.current_page === pages.a_trier ? reponseATrier.data : []),
      classeur: filtrer(reponseClasseur?.meta?.current_page === pages.classeur ? reponseClasseur.data : []),
    };
  }, [reponseNouveaux, reponseATrier, reponseClasseur, enAttenteDepart, pages]);

  const reponses = { nouveaux: reponseNouveaux, a_trier: reponseATrier, classeur: reponseClasseur };
  const bannettes = BANNETTES_CONFIG.map((b) => ({ ...b, compte: reponses[b.id]?.meta?.total ?? parBannette[b.id].length }));
  const dossiersBannetteActive = parBannette[etatTravail.bannette] ?? [];
  const pageCourante = pages[etatTravail.bannette];
  const dernierePage = reponses[etatTravail.bannette]?.meta?.last_page ?? 1;

  function changerPage(page) {
    setSelectionLot(new Set());
    setEtatTravail((s) => ({ ...s, dossierId: null }));
    setPages((s) => ({ ...s, [etatTravail.bannette]: page }));
  }

  // Sélectionne un dossier valide dès que la bannette change ou que le
  // dossier précédemment sélectionné a quitté la file (traité, ou disparu
  // d'un rechargement) — jamais un panneau vide alors que la file ne l'est
  // pas.
  useEffect(() => {
    if (dossiersBannetteActive.length === 0) {
      if (etatTravail.dossierId !== null) setEtatTravail((s) => ({ ...s, dossierId: null }));
      return;
    }
    if (!dossiersBannetteActive.some((d) => d.id === etatTravail.dossierId)) {
      setEtatTravail((s) => ({ ...s, dossierId: dossiersBannetteActive[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etatTravail.bannette, dossiersBannetteActive.map((d) => d.id).join(',')]);

  function choisirBannette(id) {
    setSelectionLot(new Set());
    setEtatTravail((s) => ({ ...s, bannette: id }));
  }

  function selectionnerDossier(id) {
    setEtatTravail((s) => ({ ...s, dossierId: id }));
  }

  function deplacer(delta) {
    if (dossiersBannetteActive.length === 0) return;
    const index = Math.max(0, dossiersBannetteActive.findIndex((d) => d.id === etatTravail.dossierId));
    const suivant = dossiersBannetteActive[Math.min(dossiersBannetteActive.length - 1, Math.max(0, index + delta))];
    selectionnerDossier(suivant.id);
  }

  function avancerApresTraitement(idTraite) {
    const restants = dossiersBannetteActive.filter((d) => d.id !== idTraite);
    if (restants.length > 0) {
      const index = dossiersBannetteActive.findIndex((d) => d.id === idTraite);
      const suivant = restants[Math.min(index, restants.length - 1)];
      selectionnerDossier(suivant.id);
    }
  }

  /**
   * Correction #1 (voir docs/questions-ont.md) : l'action réelle ne part
   * qu'à l'expiration du toast (voir useToast().differe), jamais avant.
   * Le retrait du dossier de sa bannette est en revanche immédiat — c'est
   * un simple masquage optimiste, pas l'action elle-même.
   */
  const executerDiffere = useCallback(
    ({ dossier, message, executer }) => {
      setEnAttenteDepart((s) => new Set(s).add(dossier.id));
      avancerApresTraitement(dossier.id);
      toast.differe(message, {
        executer: async () => {
          try {
            await executer();
          } finally {
            setEnAttenteDepart((s) => {
              const n = new Set(s);
              n.delete(dossier.id);
              return n;
            });
            recharger();
            rechargerSouffrance();
          }
        },
        onAnnuler: () => {
          setEnAttenteDepart((s) => {
            const n = new Set(s);
            n.delete(dossier.id);
            return n;
          });
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast, recharger, rechargerSouffrance, dossiersBannetteActive],
  );

  function acquitter(dossier) {
    executerDiffere({
      dossier,
      message: `Réception de ${dossier.numero_accuse_reception} accusée.`,
      executer: () => accuserReception(dossier.id),
    });
  }

  function envoyerAuTri(dossier) {
    executerDiffere({
      dossier,
      message: `${dossier.numero_accuse_reception} transmis au tri.`,
      executer: () => transmettreTri(dossier.id),
    });
  }

  function trier(dossier, degre) {
    setPanneauTri(null);
    executerDiffere({
      dossier,
      message:
        degre === 'normal'
          ? `${dossier.numero_accuse_reception} tenu au classeur d'attente.`
          : `${dossier.numero_accuse_reception} transmis à la DG pour avis (${DEGRE_URGENCE_LABELS[degre]}).`,
      executer: () => transmettreAvisDg(dossier.id, degre),
    });
  }

  function transmettreClasseur(dossier) {
    executerDiffere({
      dossier,
      message: `${dossier.numero_accuse_reception} transmis à la DG depuis le classeur.`,
      executer: () => transmettreDepuisClasseur(dossier.id),
    });
  }

  function ouvrirPanneauTri(dossier) {
    setDegreChoisi('normal');
    setPanneauTri({ dossier });
  }

  function basculerLot(id) {
    setSelectionLot((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function traiterLotEnBordereau() {
    setBordereauEnCours(true);
    try {
      const bordereau = await creerBordereauLot([...selectionLot]);
      await accuserReceptionBordereauLot(bordereau.id);
      toast.success(`${selectionLot.size} dossier(s) déchargé(s) en un seul bordereau.`);
      setSelectionLot(new Set());
      recharger();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Échec du regroupement en bordereau.');
    } finally {
      setBordereauEnCours(false);
    }
  }

  const dossierActif = dossiersBannetteActive.find((d) => d.id === etatTravail.dossierId) ?? null;

  function actionPrincipale(dossier) {
    if (!dossier) return null;
    if (dossier.en_transit) return () => acquitter(dossier);
    if (etatTravail.bannette === 'nouveaux') return () => envoyerAuTri(dossier);
    if (etatTravail.bannette === 'a_trier') return () => ouvrirPanneauTri(dossier);
    if (etatTravail.bannette === 'classeur') return () => transmettreClasseur(dossier);
    return null;
  }

  const actionsDossier = useMemo(() => {
    if (!dossierActif) return [];
    if (dossierActif.en_transit) {
      return [{ label: 'Confirmer la réception (a)', variant: 'primary', onTrigger: () => acquitter(dossierActif) }];
    }
    if (etatTravail.bannette === 'nouveaux') {
      return [{ label: 'Transmettre au tri', variant: 'primary', onTrigger: () => envoyerAuTri(dossierActif) }];
    }
    if (etatTravail.bannette === 'a_trier') {
      return [
        { label: 'Trier…', variant: 'primary', onTrigger: () => ouvrirPanneauTri(dossierActif) },
        { label: 'Urgent direct (u)', variant: 'secondary', onTrigger: () => trier(dossierActif, 'urgent') },
      ];
    }
    if (etatTravail.bannette === 'classeur') {
      return [{ label: 'Transmettre à la DG', variant: 'primary', onTrigger: () => transmettreClasseur(dossierActif) }];
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierActif, etatTravail.bannette]);

  useRaccourcisClavier(
    {
      j: () => deplacer(1),
      arrowdown: () => deplacer(1),
      k: () => deplacer(-1),
      arrowup: () => deplacer(-1),
      enter: () => {
        const action = actionPrincipale(dossierActif);
        action?.();
      },
      escape: () => setPanneauTri(null),
      a: () => dossierActif?.en_transit && acquitter(dossierActif),
      u: () => etatTravail.bannette === 'a_trier' && dossierActif && !dossierActif.en_transit && trier(dossierActif, 'urgent'),
      ' ': () => dossierActif?.en_transit && basculerLot(dossierActif.id),
      s: () => deplacer(1),
      1: () => actionsDossier[0]?.onTrigger?.(),
      2: () => actionsDossier[1]?.onTrigger?.(),
      '?': () => setAideOuverte(true),
    },
    !panneauTri,
  );

  // Le regroupement en bordereau (voir traiterLotEnBordereau) ne vaut que
  // pour des dossiers encore en transit — la même décharge, groupée, les
  // débloque tous d'un coup (voir CircuitQueuePage.jsx pour le même geste).
  const permetSelectionLot = dossiersBannetteActive.some((d) => d.en_transit);

  return (
    <div>
      <PageHeader
        title="Tri du courrier"
        description="Nouveaux courriers, tri par degré d'urgence, classeur d'attente — j/k pour naviguer, ? pour l'aide."
      />

      <PosteDeTravail
        bannettes={bannettes}
        bannetteActive={etatTravail.bannette}
        onSelectionnerBannette={choisirBannette}
        dossiers={dossiersBannetteActive}
        dossierSelectionneId={etatTravail.dossierId}
        onSelectionnerDossier={selectionnerDossier}
        enSouffranceParId={enSouffranceParId}
        actionsDossier={actionsDossier}
        permetSelectionLot={permetSelectionLot}
        selectionLot={selectionLot}
        onBasculerLot={basculerLot}
        barreLot={
          <>
            {selectionLot.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-sunken px-3 py-2.5">
              <span className="text-xs text-text-muted">{selectionLot.size} sélectionné(s)</span>
              <Button type="button" size="sm" disabled={bordereauEnCours} onClick={traiterLotEnBordereau}>
                {bordereauEnCours ? 'Traitement…' : 'Décharger en bordereau'}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setSelectionLot(new Set())}>
                Annuler
              </Button>
            </div>
            )}
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-text-muted">
              <Button type="button" size="sm" variant="secondary" disabled={pageCourante <= 1} onClick={() => changerPage(pageCourante - 1)}>Précédent</Button>
              <span>Page {pageCourante} sur {dernierePage}</span>
              <Button type="button" size="sm" variant="secondary" disabled={pageCourante >= dernierePage} onClick={() => changerPage(pageCourante + 1)}>Suivant</Button>
            </div>
          </>
        }
        detailDossier={
          dossierActif && (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-text-subtle">Type</dt>
                <dd className="text-text">{dossierActif.type_label}</dd>
              </div>
              {dossierActif.expediteur_externe_nom && (
                <div>
                  <dt className="text-text-subtle">Expéditeur</dt>
                  <dd className="text-text">{dossierActif.expediteur_externe_nom}</dd>
                </div>
              )}
              {dossierActif.direction_destination && (
                <div>
                  <dt className="text-text-subtle">Direction destinataire</dt>
                  <dd className="text-text">{dossierActif.direction_destination.nom}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-subtle">Reçu le</dt>
                <dd className="text-text">{new Date(dossierActif.created_at).toLocaleDateString('fr-FR')}</dd>
              </div>
              {dossierActif.en_transit && <p className="text-ont-gold-700 dark:text-ont-gold-400">En transit — décharge requise.</p>}
            </dl>
          )
        }
        panneauLateral={
          panneauTri && {
            titre: `Trier ${panneauTri.dossier.numero_accuse_reception}`,
            onFermer: () => setPanneauTri(null),
            contenu: (
              <div className="space-y-4">
                <Field label="Degré d'urgence" htmlFor="degre-tri-panneau">
                  <select id="degre-tri-panneau" className={inputClass} value={degreChoisi} onChange={(e) => setDegreChoisi(e.target.value)}>
                    <option value="normal">Normal — au classeur d'attente</option>
                    <option value="urgent">Urgent — à la DG</option>
                    <option value="tres_urgent">Très urgent — à la DG</option>
                  </select>
                </Field>
                <Button type="button" onClick={() => trier(panneauTri.dossier, degreChoisi)}>
                  Confirmer le tri
                </Button>
              </div>
            ),
          }
        }
      />

      <AideRaccourcis open={aideOuverte} onClose={() => setAideOuverte(false)} raccourcisSpecifiques={RACCOURCIS_SPECIFIQUES} />
    </div>
  );
}
