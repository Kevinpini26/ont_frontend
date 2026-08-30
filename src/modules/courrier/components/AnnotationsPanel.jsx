import { useEffect, useState } from 'react';
import { ajouterAnnotation, listAnnotations } from '../api/courrierApi';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { EmptyState } from '../../../shared/components/ui/EmptyState';

export function AnnotationsPanel({ courrierId }) {
  const [annotations, setAnnotations] = useState([]);
  const [texte, setTexte] = useState('');
  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function charger() {
    setChargement(true);
    try {
      setAnnotations(await listAnnotations(courrierId));
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courrierId]);

  async function ajouter(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoiEnCours(true);
    try {
      await ajouterAnnotation(courrierId, texte);
      setTexte('');
      await charger();
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Annotations" />
      <CardBody>
        {chargement ? (
          <LoadingBlock />
        ) : annotations.length === 0 ? (
          <EmptyState title="Aucune annotation pour le moment" />
        ) : (
          <ul className="mb-4 divide-y divide-border">
            {annotations.map((a) => (
              <li key={a.id} className="py-2.5">
                <p className="text-sm text-text">{a.contenu}</p>
                <p className="mt-0.5 text-xs text-text-subtle">
                  {a.auteur?.name} · {new Date(a.created_at).toLocaleString('fr-FR')}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={ajouter} className="flex gap-2">
          <input
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Ajouter une annotation…"
            className={inputClass}
          />
          <Button type="submit" variant="secondary" disabled={envoiEnCours}>
            Ajouter
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
