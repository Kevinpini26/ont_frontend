import { RailBannettes } from './RailBannettes';
import { FileDossiers } from './FileDossiers';
import { PanneauDossier } from './PanneauDossier';
import { SlidePanel } from './SlidePanel';
import { useLargeurEtroite } from './useLargeurEtroite';

/**
 * Composant PosteDeTravail — structure à trois colonnes (rail des
 * bannettes ~260px / file de dossiers ~420px / panneau dossier, le reste)
 * validée pour servir de modèle aux huit écrans de travail du circuit
 * courrier (voir docs/questions-ont.md). Ne possède aucune donnée
 * métier : la page appelante (ex. PosteDeTravailTriPage) fournit les
 * bannettes, la file, les actions et le contenu du panneau — ce composant
 * n'orchestre que la disposition, le repli en icônes sous 1280px
 * (useLargeurEtroite, correction #3) et le montage du panneau latéral.
 */
export function PosteDeTravail({
  bannettes,
  bannetteActive,
  onSelectionnerBannette,
  dossiers,
  dossierSelectionneId,
  onSelectionnerDossier,
  enSouffranceParId,
  actionsDossier,
  detailDossier,
  panneauLateral,
  selectionLot,
  onBasculerLot,
  permetSelectionLot,
  barreLot,
}) {
  const etroit = useLargeurEtroite();
  const dossierSelectionne = dossiers.find((d) => d.id === dossierSelectionneId) ?? null;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[28rem] overflow-hidden rounded-card border border-border bg-surface">
      <RailBannettes bannettes={bannettes} actif={bannetteActive} onSelect={onSelectionnerBannette} etroit={etroit} />

      <div className="flex min-h-0 w-[420px] shrink-0 flex-col border-r border-border">
        {barreLot}
        <FileDossiers
          dossiers={dossiers}
          selectionneId={dossierSelectionneId}
          onSelectionner={onSelectionnerDossier}
          enSouffranceParId={enSouffranceParId}
          selectionLot={selectionLot}
          onBasculerLot={onBasculerLot}
          permetLot={permetSelectionLot}
        />
      </div>

      <PanneauDossier dossier={dossierSelectionne} actions={actionsDossier}>
        {detailDossier}
      </PanneauDossier>

      {panneauLateral && (
        <SlidePanel open title={panneauLateral.titre} onClose={panneauLateral.onFermer} etroit={etroit}>
          {panneauLateral.contenu}
        </SlidePanel>
      )}
    </div>
  );
}
