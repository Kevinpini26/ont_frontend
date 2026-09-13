import { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ajouterAnnotation, listAnnotations } from '../api/courrierApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { inputClass } from '../../../shared/components/ui/Field';
import { SkeletonAvatarLines } from '../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../shared/components/ui/EmptyState';

/** Rond d'initiale — même motif que le badge de compte dans Sidebar/AppLayout, ici à l'échelle d'un fil de discussion. */
function AvatarInitiale({ nom }) {
  return (
    <span className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-ont-blue-800 text-sm font-semibold text-white">
      {(nom?.trim()?.charAt(0) || '?').toUpperCase()}
    </span>
  );
}

export function AnnotationsPanel({ courrierId }) {
  const user = useAuthStore((s) => s.user);
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
      await ajouterAnnotation(courrierId, texte.trim());
      setTexte('');
      await charger();
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Annotations"
        description={!chargement && annotations.length > 0 ? `${annotations.length} message${annotations.length > 1 ? 's' : ''}` : undefined}
      />
      <CardBody className="space-y-5">
        {chargement ? (
          <SkeletonAvatarLines />
        ) : annotations.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={28} />}
            title="Aucune annotation pour le moment"
            description="Les échanges internes sur ce dossier — remarques, consignes, précisions — apparaîtront ici."
          />
        ) : (
          <ul className="space-y-4">
            {annotations.map((a) => (
              <li key={a.id} className="flex gap-3">
                <AvatarInitiale nom={a.auteur?.name} />
                <div className="min-w-0 flex-1 rounded-field bg-surface-sunken px-3.5 py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-sm font-medium text-text">{a.auteur?.name ?? 'Utilisateur'}</span>
                    <time className="text-xs text-text-subtle">{new Date(a.created_at).toLocaleString('fr-FR')}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{a.contenu}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={ajouter} className="flex gap-3 border-t border-border pt-5">
          <AvatarInitiale nom={user?.name} />
          <div className="min-w-0 flex-1 space-y-2">
            <textarea
              rows={2}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Ajouter une annotation…"
              className={`${inputClass} resize-none`}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" size="sm" loading={envoiEnCours} disabled={!texte.trim()}>
                Ajouter
              </Button>
            </div>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
