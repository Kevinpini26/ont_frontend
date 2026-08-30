import { useEffect, useMemo, useState } from 'react';
import { createDirection, deleteDirection, listDirections, updateDirection } from '../api/directionsApi';
import { SearchBar } from '../../../shared/components/SearchBar';
import { ExportButtons } from '../../../shared/components/ExportButtons';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { AnnonceChargement } from '../../../shared/components/ui/AnnonceChargement';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  tbodyClass,
  tdClass,
  tdClassChiffre,
  trHoverClass,
  SkeletonRows,
  ThSortable,
  basculerTri,
} from '../../../shared/components/ui/Table';
import { Building2 } from 'lucide-react';
import { useConfirm } from '../../../shared/hooks/useConfirm';

const DIRECTION_VIDE = { code: '', nom: '', actif: true, capacite_max: '' };

export function AdminDirectionsPage() {
  const [directions, setDirections] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [formulaire, setFormulaire] = useState(DIRECTION_VIDE);
  const [edition, setEdition] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [tri, setTri] = useState(null);
  const { confirm, dialogProps } = useConfirm();

  function onTri(colonne) {
    setTri((t) => basculerTri(t, colonne));
  }

  async function charger() {
    setChargement(true);
    try {
      setDirections(await listDirections());
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  const directionsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    const resultat = terme
      ? directions.filter((d) => d.code.toLowerCase().includes(terme) || d.nom.toLowerCase().includes(terme))
      : directions;
    if (!tri) return resultat;
    const copie = [...resultat];
    copie.sort((a, b) => {
      let cmp;
      if (tri.colonne === 'capacite_max') {
        cmp = (a.capacite_max ?? Infinity) - (b.capacite_max ?? Infinity);
      } else {
        cmp = String(a[tri.colonne]).localeCompare(String(b[tri.colonne]), 'fr');
      }
      return tri.sens === 'asc' ? cmp : -cmp;
    });
    return copie;
  }, [directions, recherche, tri]);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const payload = {
      ...formulaire,
      capacite_max: formulaire.capacite_max === '' ? null : Number(formulaire.capacite_max),
    };
    try {
      if (edition) {
        await updateDirection(edition.id, payload);
      } else {
        await createDirection(payload);
      }
      setFormulaire(DIRECTION_VIDE);
      setEdition(null);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Échec de l'enregistrement.");
    } finally {
      setEnvoi(false);
    }
  }

  function commencerEdition(direction) {
    setEdition(direction);
    setFormulaire({
      code: direction.code,
      nom: direction.nom,
      actif: direction.actif,
      capacite_max: direction.capacite_max ?? '',
    });
  }

  async function supprimer(direction) {
    const ok = await confirm({
      title: 'Supprimer cette direction ?',
      description: `La direction ${direction.code} — ${direction.nom} sera définitivement supprimée.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteDirection(direction.id);
    charger();
  }

  return (
    <div>
      <PageHeader title="Gestion des directions" description="Les 8 directions actives de l'ONT et leur statut." />

      <Card className="mb-6">
        <CardHeader title={edition ? `Modifier ${edition.code}` : 'Nouvelle direction'} />
        <CardBody>
          {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
          <form onSubmit={soumettre} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Code" htmlFor="code" required>
              <input
                id="code"
                className={inputClass}
                value={formulaire.code}
                onChange={(e) => setFormulaire((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
              />
            </Field>
            <Field label="Nom" htmlFor="nom" required>
              <input
                id="nom"
                className={inputClass}
                value={formulaire.nom}
                onChange={(e) => setFormulaire((f) => ({ ...f, nom: e.target.value }))}
                required
              />
            </Field>
            <Field label="Statut" htmlFor="actif">
              <select
                id="actif"
                className={inputClass}
                value={formulaire.actif ? '1' : '0'}
                onChange={(e) => setFormulaire((f) => ({ ...f, actif: e.target.value === '1' }))}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </Field>
            <Field label="Capacité max. de stagiaires" htmlFor="capacite_max" hint="Laisser vide = aucune limite.">
              <input
                id="capacite_max"
                type="number"
                min="0"
                className={inputClass}
                value={formulaire.capacite_max}
                onChange={(e) => setFormulaire((f) => ({ ...f, capacite_max: e.target.value }))}
              />
            </Field>
            <div className="flex items-end gap-2 sm:col-span-3">
              <Button type="submit" disabled={envoi}>
                {envoi ? 'Enregistrement…' : edition ? 'Enregistrer' : 'Créer'}
              </Button>
              {edition && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEdition(null);
                    setFormulaire(DIRECTION_VIDE);
                  }}
                >
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Directions (${directionsFiltrees.length})`}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <SearchBar value={recherche} onChange={setRecherche} placeholder="Rechercher par code ou nom…" />
              <ExportButtons
                data={directionsFiltrees}
                filename="directions-ont"
                columns={[
                  { label: 'Code', value: (d) => d.code },
                  { label: 'Nom', value: (d) => d.nom },
                  { label: 'Statut', value: (d) => (d.actif ? 'Active' : 'Inactive') },
                  { label: 'Capacité max.', value: (d) => d.capacite_max ?? 'Illimitée' },
                ]}
              />
            </div>
          }
        />
        <CardBody className="p-0">
          <AnnonceChargement chargement={chargement} count={directionsFiltrees.length} libelle="direction(s)" />
          {!chargement && directionsFiltrees.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Building2 size={32} />} title="Aucune direction ne correspond" description="Essayez une autre recherche." />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <ThSortable label="Code" sortKey="code" tri={tri} onTri={onTri} />
                    <ThSortable label="Nom" sortKey="nom" tri={tri} onTri={onTri} />
                    <th className={thClass}>Statut</th>
                    <ThSortable label="Capacité" sortKey="capacite_max" tri={tri} onTri={onTri} className="text-right" />
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={5} />
                  ) : (
                    directionsFiltrees.map((d) => (
                      <tr key={d.id} className={trHoverClass}>
                        <td className="px-4 py-3 align-middle font-semibold text-text">{d.code}</td>
                        <td className={`${tdClass} max-w-[16rem] truncate`} title={d.nom}>{d.nom}</td>
                        <td className={tdClass}>
                          <Badge tone={d.actif ? 'success' : 'neutral'}>{d.actif ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td className={tdClassChiffre}>{d.capacite_max ?? <span className="text-text-subtle">Illimitée</span>}</td>
                        <td className={tdClass}>
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => commencerEdition(d)}>
                              Modifier
                            </Button>
                            <Button type="button" variant="danger" size="sm" onClick={() => supprimer(d)}>
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
