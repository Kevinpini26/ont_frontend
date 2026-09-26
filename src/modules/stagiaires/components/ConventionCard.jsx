import { useState } from 'react';
import { signerConventionDirection } from '../api/stagiairesApi';
import { estDirecteurDirection } from '../../kernel/constants';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';

export function ConventionCard({ stagiaire, user, executer }) {
  const [envoi, setEnvoi] = useState(false);
  const [apercuOuvert, setApercuOuvert] = useState(false);
  const peutSigner =
    estDirecteurDirection(user) &&
    user.direction_id === stagiaire.direction?.id &&
    !stagiaire.convention.signee_direction_at;

  async function signer() {
    setEnvoi(true);
    try {
      await executer(() => signerConventionDirection(stagiaire.id));
    } catch {
      // erreur déjà affichée par `executer`
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Convention de stage" />
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={stagiaire.convention.signee_direction_at ? 'success' : 'neutral'}>
            {stagiaire.convention.signee_direction_at
              ? `Signée par la direction (${stagiaire.convention.signee_direction_par ?? 'responsable'}, ${new Date(stagiaire.convention.signee_direction_at).toLocaleDateString('fr-FR')})`
              : 'Non signée par la direction'}
          </Badge>
          <Badge tone={stagiaire.convention.signee_stagiaire_at ? 'success' : 'neutral'}>
            {stagiaire.convention.signee_stagiaire_at
              ? `Signée par le stagiaire (${new Date(stagiaire.convention.signee_stagiaire_at).toLocaleDateString('fr-FR')})`
              : 'Non signée par le stagiaire'}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setApercuOuvert(true)}>
            Voir le document
          </Button>
          <DocumentPreviewModal
            open={apercuOuvert}
            onClose={() => setApercuOuvert(false)}
            title="Convention de stage"
            url={`/stagiaires/${stagiaire.id}/convention/telecharger`}
            downloadFilename={`convention-stage-${stagiaire.nom}.pdf`}
          />
          {peutSigner && (
            <Button type="button" size="sm" disabled={envoi} onClick={signer}>
              {envoi ? 'Signature…' : 'Signer pour la direction'}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
