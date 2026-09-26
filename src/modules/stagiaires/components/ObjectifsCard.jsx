import { useState } from 'react';
import { definirObjectifs } from '../api/stagiairesApi';
import { estDirecteurDirection } from '../../kernel/constants';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { inputClass } from '../../../shared/components/ui/Field';
import { EmptyState } from '../../../shared/components/ui/EmptyState';

export function ObjectifsCard({ stagiaire, user, executer }) {
  const [objectifs, setObjectifs] = useState(stagiaire.objectifs ?? ['', '']);
  const [edition, setEdition] = useState(!stagiaire.objectifs);
  const [envoi, setEnvoi] = useState(false);

  const peutDefinir =
    estDirecteurDirection(user) &&
    user.direction_id === stagiaire.direction?.id &&
    ['stage_en_cours', 'evaluation_en_cours'].includes(stagiaire.statut);

  if (!peutDefinir && !stagiaire.objectifs?.length) return null;

  function majObjectif(index, valeur) {
    setObjectifs((liste) => liste.map((o, i) => (i === index ? valeur : o)));
  }

  async function soumettre(e) {
    e.preventDefault();
    const nettoyes = objectifs.map((o) => o.trim()).filter(Boolean);
    setEnvoi(true);
    try {
      await executer(() => definirObjectifs(stagiaire.id, nettoyes));
      setEdition(false);
    } catch {
      // erreur déjà affichée par `executer`
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Fiche de mission — objectifs du stage"
        action={
          peutDefinir &&
          !edition && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setEdition(true)}>
              Modifier
            </Button>
          )
        }
      />
      <CardBody>
        {edition && peutDefinir ? (
          <form onSubmit={soumettre} className="space-y-3">
            <p className="text-xs text-text-subtle">Entre 2 et 5 objectifs courts.</p>
            {objectifs.map((objectif, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={objectif}
                  onChange={(e) => majObjectif(index, e.target.value)}
                  placeholder={`Objectif ${index + 1}`}
                />
                {objectifs.length > 2 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setObjectifs((l) => l.filter((_, i) => i !== index))}>
                    Retirer
                  </Button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              {objectifs.length < 5 && (
                <Button type="button" variant="secondary" size="sm" onClick={() => setObjectifs((l) => [...l, ''])}>
                  Ajouter un objectif
                </Button>
              )}
              <Button type="submit" size="sm" disabled={envoi}>
                {envoi ? 'Enregistrement…' : 'Enregistrer les objectifs'}
              </Button>
            </div>
          </form>
        ) : stagiaire.objectifs?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
            {stagiaire.objectifs.map((objectif, index) => (
              <li key={index}>{objectif}</li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Aucun objectif défini pour le moment" />
        )}
      </CardBody>
    </Card>
  );
}
