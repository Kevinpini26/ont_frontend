import { useEffect, useState } from 'react';
import { getDisponibiliteDemandes, updateDisponibiliteDemandes } from '../api/stagiairesApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

const TYPES = [
  { cle: 'academique', libelle: 'Stage académique' },
  { cle: 'professionnel', libelle: 'Stage professionnel' },
];

export function DisponibiliteDemandesPage() {
  const [disponibilite, setDisponibilite] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(null);

  useEffect(() => {
    getDisponibiliteDemandes()
      .then(setDisponibilite)
      .finally(() => setChargement(false));
  }, []);

  async function basculer(type) {
    setEnvoiEnCours(type);
    try {
      setDisponibilite(await updateDisponibiliteDemandes(type, !disponibilite[type]));
    } finally {
      setEnvoiEnCours(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Disponibilité des demandes de stage — ouvrez ou fermez temporairement les candidatures par type."
      />

      <Card>
        <CardHeader
          title="Disponibilité des demandes de stage"
          description="Un type fermé devient inaccessible sur la page d'accueil et sur le formulaire de dépôt en ligne."
        />
        <CardBody>
          {chargement || !disponibilite ? (
            <LoadingBlock />
          ) : (
            <div className="space-y-4">
              {TYPES.map(({ cle, libelle }) => {
                const ouvert = disponibilite[cle];
                return (
                  <div
                    key={cle}
                    className="flex items-center justify-between rounded-field border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text">{libelle}</span>
                      <Badge tone={ouvert ? 'success' : 'warning'}>{ouvert ? 'Ouvert' : 'Fermé'}</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={envoiEnCours === cle}
                      onClick={() => basculer(cle)}
                    >
                      {ouvert ? 'Fermer les demandes' : 'Ouvrir les demandes'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
