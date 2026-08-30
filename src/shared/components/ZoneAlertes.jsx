import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { LoadingBlock } from './ui/Spinner';

// gold-700 (pas 500) : vérifié par calcul, ont-gold-500 ne donne que 1,65
// de contraste sur fond clair — bien sous les 3,0 requis pour un élément
// graphique porteur de sens.
const COULEUR_PASTILLE = {
  info: 'bg-ont-blue-500',
  warning: 'bg-ont-gold-700 dark:bg-ont-gold-500',
  danger: 'bg-ont-red-500',
};

/**
 * Une alerte est une ligne, pas une carte (Lot C3) : pastille de gravité à
 * gauche, libellé, indication secondaire (ancienneté, quota...) en gris,
 * chevron à droite — jamais une carte par catégorie comme avant ce lot.
 * `items` est déjà mis en forme par la page appelante (chaque catégorie de
 * données a sa propre façon de produire {id, to, gravite, texte, detail}),
 * ce composant ne fait qu'afficher la liste unifiée.
 */
export function ZoneAlertes({ items, chargement, titre = 'Alertes', videTitre = 'Aucun dossier ne nécessite votre attention', videDescription }) {
  return (
    <Card>
      <CardHeader
        title={titre}
        action={!chargement && items.length > 0 && <Badge tone={items.some((i) => i.gravite === 'danger') ? 'danger' : 'warning'}>{items.length}</Badge>}
      />
      <CardBody>
        {chargement ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <EmptyState title={videTitre} description={videDescription} />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="flex items-center gap-3 py-2.5 text-sm hover:text-ont-blue-700">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COULEUR_PASTILLE[item.gravite]}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-text">{item.texte}</span>
                  {item.detail && <span className="shrink-0 text-xs text-text-subtle">{item.detail}</span>}
                  <ChevronRight size={16} className="shrink-0 text-text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
