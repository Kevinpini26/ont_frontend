import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';

const LIEN_TYPE_LABELS = {
  convention: 'Convention de stage',
  retour_experience: "Retour d'expérience",
};

export function LiensARelancerCard({ liens }) {
  const base = `${window.location.origin}/liens`;

  return (
    <Card>
      <CardHeader title="Liens à transmettre au stagiaire" description="À relayer manuellement si l'e-mail du candidat n'a pas pu être utilisé." />
      <CardBody className="space-y-2">
        {liens.map((lien) => (
          <div key={lien.token} className="flex items-center justify-between gap-3 rounded-field border border-border p-3 text-sm">
            <div>
              <p className="font-medium text-text">{LIEN_TYPE_LABELS[lien.type] ?? lien.type}</p>
              <p className="truncate text-xs text-text-subtle">{`${base}/${lien.token}`}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(`${base}/${lien.token}`)}
            >
              Copier
            </Button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
