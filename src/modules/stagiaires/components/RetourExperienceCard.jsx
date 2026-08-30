import { useEffect, useState } from 'react';
import { getRetourExperience } from '../api/stagiairesApi';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SkeletonLines } from '../../../shared/components/ui/Skeleton';

export function RetourExperienceCard({ stagiaireId }) {
  const [retour, setRetour] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [absent, setAbsent] = useState(false);

  useEffect(() => {
    getRetourExperience(stagiaireId)
      .then(setRetour)
      .catch(() => setAbsent(true))
      .finally(() => setChargement(false));
  }, [stagiaireId]);

  return (
    <Card>
      <CardHeader title="Retour d'expérience du stagiaire" description="Confidentiel — jamais visible par la direction d'accueil." />
      <CardBody>
        {chargement ? (
          <SkeletonLines lignes={3} />
        ) : absent || !retour ? (
          <EmptyState title="Aucun retour soumis pour le moment" description="Le lien envoyé au stagiaire est à usage unique." />
        ) : (
          <div className="space-y-2 text-sm text-text-muted">
            <p>Encadrement : <strong>{retour.note_encadrement} / 5</strong></p>
            <p>Missions confiées : <strong>{retour.note_missions} / 5</strong></p>
            <p>Ambiance : <strong>{retour.note_ambiance} / 5</strong></p>
            {retour.commentaire && <p className="italic">« {retour.commentaire} »</p>}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
