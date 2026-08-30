import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createCourrier, listCourriers } from '../api/courrierApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { marquerConsulte } from '../../kernel/api/notificationsApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { STATUT_LABELS, TYPE_LABELS } from '../constants';
import { SearchBar } from '../../../shared/components/SearchBar';
import { ExportButtons } from '../../../shared/components/ExportButtons';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { FileUploadPreview } from '../../../shared/components/ui/FileUploadPreview';
import { AnnonceChargement } from '../../../shared/components/ui/AnnonceChargement';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  trHoverClass,
  SkeletonRows,
} from '../../../shared/components/ui/Table';
import { TipTapEditor } from './TipTapEditor';
import { Mail } from 'lucide-react';

const FORMULAIRE_VIDE = {
  objet: '',
  type: 'correspondance_generale',
  direction_destination_id: '',
  contenu: '',
  piece_jointe: null,
};

/**
 * Correspondance envoyée/reçue d'une direction (envoi + suivi), commune aux
 * deux tableaux de bord "direction" : celui d'une direction standard et
 * celui de la DFP pour son propre périmètre courrier (la DFP est elle-même
 * une des huit directions).
 *
 * Émis et reçus sont deux listes indépendantes, paginées et filtrées côté
 * serveur (direction_origine_id / direction_destination_id) — auparavant
 * seule la première page (20 lignes, toutes directions) était chargée puis
 * filtrée en mémoire : un courrier de la direction hors de ces 20 lignes
 * n'apparaissait tout simplement jamais.
 */
export function DirectionCourrierWorkspace() {
  const user = useAuthStore((s) => s.user);
  const [directions, setDirections] = useState([]);
  const [recherche, setRecherche] = useState('');
  // Lecture unique au montage : arriver depuis une carte de tableau de bord
  // (voir StatCard "to") avec un statut déjà posé, pas une synchronisation
  // continue avec l'URL.
  const [searchParams] = useSearchParams();
  const [statut, setStatut] = useState(() => searchParams.get('statut') ?? '');

  const [emis, setEmis] = useState([]);
  const [metaEmis, setMetaEmis] = useState(null);
  const [pageEmis, setPageEmis] = useState(1);

  const [recus, setRecus] = useState([]);
  const [metaRecus, setMetaRecus] = useState(null);
  const [pageRecus, setPageRecus] = useState(1);

  const [chargement, setChargement] = useState(true);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // TipTapEditor ne resynchronise son contenu qu'au montage (voir sa propre
  // doc) : remonter l'éditeur via cette clé est le moyen le plus sûr de le
  // vider après un envoi réussi, sans toucher au composant partagé.
  const [cleFormulaire, setCleFormulaire] = useState(0);

  async function charger() {
    setChargement(true);
    try {
      const paramsCommuns = {};
      if (recherche) paramsCommuns.recherche = recherche;
      if (statut) paramsCommuns.statut = statut;

      const [{ data: dataEmis, meta: metaPageEmis }, { data: dataRecus, meta: metaPageRecus }, dirs] = await Promise.all([
        listCourriers({ ...paramsCommuns, direction_origine_id: user.direction_id, page: pageEmis }),
        listCourriers({ ...paramsCommuns, direction_destination_id: user.direction_id, page: pageRecus }),
        listDirections(),
      ]);
      setEmis(dataEmis);
      setMetaEmis(metaPageEmis);
      setRecus(dataRecus);
      setMetaRecus(metaPageRecus);
      setDirections(dirs.filter((d) => d.id !== user.direction_id));
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, statut, pageEmis, pageRecus]);

  // Marque "vu" au niveau de cette section (pas seulement à l'ouverture de
  // page) : la prochaine tick de polling de la sidebar (jusqu'à 45s après)
  // reflète la baisse du badge Courriers.
  useEffect(() => {
    marquerConsulte('courriers_recus');
  }, []);

  useEffect(() => {
    setPageEmis(1);
    setPageRecus(1);
  }, [recherche, statut]);

  async function envoyer(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await createCourrier({
        objet: formulaire.objet,
        type: formulaire.type,
        direction_destination_id: formulaire.direction_destination_id || undefined,
        contenu: formulaire.contenu || undefined,
        piece_jointe: formulaire.piece_jointe || undefined,
      });
      setFormulaire(FORMULAIRE_VIDE);
      setCleFormulaire((c) => c + 1);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Échec de l'envoi.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  const colonnesExport = [
    { label: 'Référence', value: (c) => c.numero_accuse_reception },
    { label: 'Objet', value: (c) => c.objet },
    { label: 'Statut', value: (c) => c.statut_label },
    { label: 'Date', value: (c) => new Date(c.created_at).toLocaleDateString('fr-FR') },
  ];

  return (
    <>
      <Card className="mb-6">
        <CardHeader title="Envoyer un courrier" description="Vers une autre direction, ou vers la Direction Générale (laisser le champ vide)." />
        <CardBody>
          {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
          <form onSubmit={envoyer} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Objet" htmlFor="objet" required>
                <input
                  id="objet"
                  className={inputClass}
                  value={formulaire.objet}
                  onChange={(e) => setFormulaire((f) => ({ ...f, objet: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Destination" htmlFor="destination">
                <select
                  id="destination"
                  className={inputClass}
                  value={formulaire.direction_destination_id}
                  onChange={(e) => setFormulaire((f) => ({ ...f, direction_destination_id: e.target.value }))}
                >
                  <option value="">Direction Générale (DG)</option>
                  {directions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.nom}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Contenu du courrier" htmlFor="contenu">
              <TipTapEditor
                key={cleFormulaire}
                content={formulaire.contenu}
                onChange={(contenu) => setFormulaire((f) => ({ ...f, contenu }))}
              />
            </Field>

            <Field label="Pièce jointe (facultatif)" htmlFor="piece_jointe" hint="PDF ou image scannée, 5 Mo max.">
              <FileUploadPreview
                id="piece_jointe"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                value={formulaire.piece_jointe}
                onChange={(piece_jointe) => setFormulaire((f) => ({ ...f, piece_jointe }))}
              />
            </Field>

            <div>
              <Button type="submit" disabled={envoiEnCours}>
                {envoiEnCours ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Recherche">
              <SearchBar value={recherche} onChange={setRecherche} placeholder="Objet ou numéro…" />
            </Field>
            <Field label="Statut" htmlFor="statut_courrier">
              <select id="statut_courrier" className={inputClass} value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(STATUT_LABELS).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={`Courriers émis (${metaEmis?.total ?? 0})`}
            action={<ExportButtons data={emis} columns={colonnesExport} filename="courriers-emis" />}
          />
          <CardBody className="p-0">
            <AnnonceChargement chargement={chargement} count={emis.length} libelle="courrier(s) émis" />
            <TableauCourriers courriers={emis} chargement={chargement} />
            <div className="px-4 pb-4">
              <Pagination meta={metaEmis} onPageChange={setPageEmis} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Courriers reçus (${metaRecus?.total ?? 0})`}
            action={<ExportButtons data={recus} columns={colonnesExport} filename="courriers-recus" />}
          />
          <CardBody className="p-0">
            <AnnonceChargement chargement={chargement} count={recus.length} libelle="courrier(s) reçu(s)" />
            <TableauCourriers courriers={recus} chargement={chargement} />
            <div className="px-4 pb-4">
              <Pagination meta={metaRecus} onPageChange={setPageRecus} />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function TableauCourriers({ courriers, chargement }) {
  if (!chargement && courriers.length === 0) {
    return (
      <div className="p-6">
        <EmptyState icon={<Mail size={32} />} title="Aucun courrier" description="Les courriers apparaîtront ici dès qu'il y en aura." />
      </div>
    );
  }

  return (
    <TableWrap>
      <table className={tableClass}>
        <thead className={theadClass}>
          <tr>
            <th className={thClass}>Référence</th>
            <th className={thClass}>Objet</th>
            <th className={thClass}>Type</th>
            <th className={thClass}>Statut</th>
            <th className={thClass}></th>
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {chargement ? (
            <SkeletonRows colonnes={5} />
          ) : (
            courriers.map((c) => (
              <tr key={c.id} className={trHoverClass}>
                <td className={`${tdClassPremiere} whitespace-nowrap`}>{c.numero_accuse_reception}</td>
                <td className={`${tdClass} max-w-[14rem]`} title={c.objet}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{c.objet}</span>
                    {c.initie_par_dg && (
                      <Badge tone="info" className="shrink-0">
                        DG
                      </Badge>
                    )}
                  </div>
                </td>
                <td className={tdClass}>{TYPE_LABELS[c.type]}</td>
                <td className={tdClass}>
                  <Badge tone="info">{STATUT_LABELS[c.statut]}</Badge>
                </td>
                <td className={tdClass}>
                  <Link to={`/courriers/${c.id}`}>
                    <Button type="button" variant="secondary" size="sm">
                      Suivre
                    </Button>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </TableWrap>
  );
}
