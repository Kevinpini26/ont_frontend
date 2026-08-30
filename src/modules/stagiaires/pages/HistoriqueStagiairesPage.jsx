import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listStagiaires } from '../api/stagiairesApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { AnnonceChargement } from '../../../shared/components/ui/AnnonceChargement';
import { ExportButtons } from '../../../shared/components/ExportButtons';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  tdClassChiffre,
  trHoverClass,
  SkeletonRows,
  ThSortable,
  basculerTri,
} from '../../../shared/components/ui/Table';
import { GraduationCap } from 'lucide-react';

const ANNEE_COURANTE = new Date().getFullYear();
const ANNEES = Array.from({ length: 8 }, (_, i) => ANNEE_COURANTE - i);

export function HistoriqueStagiairesPage() {
  const [directions, setDirections] = useState([]);
  const [annee, setAnnee] = useState('');
  const [directionId, setDirectionId] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [nom, setNom] = useState('');
  const [stagiaires, setStagiaires] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [tri, setTri] = useState(null);

  useEffect(() => {
    listDirections().then(setDirections);
  }, []);

  function onTri(colonne) {
    setTri((t) => basculerTri(t, colonne));
  }

  const stagiairesTries = useMemo(() => {
    if (!tri) return stagiaires;
    const copie = [...stagiaires];
    copie.sort((a, b) => {
      let cmp;
      if (tri.colonne === 'cloture_at') {
        cmp = new Date(a.cloture_at ?? 0) - new Date(b.cloture_at ?? 0);
      } else if (tri.colonne === 'note_finale') {
        cmp = (a.evaluation?.note_finale ?? -1) - (b.evaluation?.note_finale ?? -1);
      } else {
        cmp = String(a.nom).localeCompare(String(b.nom), 'fr');
      }
      return tri.sens === 'asc' ? cmp : -cmp;
    });
    return copie;
  }, [stagiaires, tri]);

  async function rechercher() {
    setChargement(true);
    try {
      const params = { statut: 'cloture' };
      if (annee) params.annee = annee;
      if (directionId) params.direction_id = directionId;
      if (etablissement) params.etablissement_origine = etablissement;
      if (nom) params.nom = nom;
      const { data } = await listStagiaires(params);
      setStagiaires(data);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    rechercher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annee, directionId, etablissement, nom]);

  return (
    <div>
      <PageHeader
        title="Historique des stagiaires"
        description="Archive des dossiers clôturés, consultable sans limite de date — aucune purge automatique."
      />

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Année de clôture" htmlFor="annee">
              <select id="annee" className={inputClass} value={annee} onChange={(e) => setAnnee(e.target.value)}>
                <option value="">Toutes</option>
                {ANNEES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Direction" htmlFor="direction_id">
              <select id="direction_id" className={inputClass} value={directionId} onChange={(e) => setDirectionId(e.target.value)}>
                <option value="">Toutes</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Établissement d'origine" htmlFor="etablissement">
              <input id="etablissement" className={inputClass} value={etablissement} onChange={(e) => setEtablissement(e.target.value)} placeholder="Université, institut…" />
            </Field>
            <Field label="Nom du stagiaire" htmlFor="nom">
              <input id="nom" className={inputClass} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Rechercher un nom…" />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Dossiers clôturés (${stagiaires.length})`}
          action={
            <ExportButtons
              data={stagiaires}
              filename="historique-stagiaires"
              columns={[
                { label: 'Nom', value: (s) => s.nom },
                { label: 'Type de stage', value: (s) => s.type_stage_label ?? '' },
                { label: 'Établissement', value: (s) => s.etablissement_origine },
                { label: 'Direction', value: (s) => s.direction?.code ?? '' },
                { label: 'Clôturé le', value: (s) => (s.cloture_at ? new Date(s.cloture_at).toLocaleDateString('fr-FR') : '') },
                { label: 'Note finale', value: (s) => s.evaluation?.note_finale ?? '' },
              ]}
            />
          }
        />
        <CardBody className="p-0">
          <AnnonceChargement chargement={chargement} count={stagiaires.length} libelle="dossier(s) clôturé(s)" />
          {!chargement && stagiaires.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<GraduationCap size={32} />} title="Aucun dossier ne correspond à ces critères" />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <ThSortable label="Nom" sortKey="nom" tri={tri} onTri={onTri} />
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Établissement</th>
                    <th className={thClass}>Direction</th>
                    <ThSortable label="Clôturé le" sortKey="cloture_at" tri={tri} onTri={onTri} className="text-right" />
                    <ThSortable label="Note finale" sortKey="note_finale" tri={tri} onTri={onTri} className="text-right" />
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={7} />
                  ) : (
                    stagiairesTries.map((s) => (
                      <tr key={s.id} className={trHoverClass}>
                        <td className={`${tdClassPremiere} whitespace-nowrap`}>{s.nom}</td>
                        <td className={tdClass}>
                          <Badge tone="neutral">{s.type_stage_label}</Badge>
                        </td>
                        <td className={`${tdClass} max-w-[14rem] truncate`} title={s.etablissement_origine}>{s.etablissement_origine}</td>
                        <td className={tdClass}>{s.direction?.code ?? '—'}</td>
                        <td className={tdClassChiffre}>{s.cloture_at ? new Date(s.cloture_at).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className={tdClassChiffre}>
                          <Badge tone="info">{s.evaluation?.note_finale ?? '—'} / 100</Badge>
                        </td>
                        <td className={tdClass}>
                          <Link to={`/stagiaires/${s.id}`}>
                            <Button type="button" variant="secondary" size="sm">
                              Ouvrir
                            </Button>
                          </Link>
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
    </div>
  );
}
