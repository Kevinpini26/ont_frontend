import { useEffect, useMemo, useState } from 'react';
import { createUser, deleteUser, listUsers, revokeUserTokens, updateUser } from '../api/usersApi';
import { listDirections } from '../api/directionsApi';
import { updateDgDisponibilite } from '../api/dgDisponibiliteApi';
import { ROLES, ROLES_ATTRIBUABLES, ROLE_LABELS, POSTES, POSTE_LABELS } from '../constants';
import { SearchBar } from '../../../shared/components/SearchBar';
import { ExportButtons } from '../../../shared/components/ExportButtons';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
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
import { useConfirm } from '../../../shared/hooks/useConfirm';

const FORMULAIRE_VIDE = {
  name: '',
  email: '',
  password: '',
  role: ROLES.DIRECTEUR_DIRECTION,
  poste: '',
  direction_id: '',
};

const ROLES_SANS_DIRECTION = [ROLES.ADMINISTRATEUR, ROLES.AGENT_DFP];

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [directions, setDirections] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [edition, setEdition] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  async function charger() {
    setChargement(true);
    try {
      const [{ data }, dirs] = await Promise.all([listUsers(), listDirections()]);
      setUsers(data);
      setDirections(dirs);
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  const usersFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(terme) || u.email.toLowerCase().includes(terme),
    );
  }, [users, recherche]);

  const directionRequise = !ROLES_SANS_DIRECTION.includes(formulaire.role);
  const posteRequis = formulaire.role === ROLES.AGENT_CIRCUIT_COURRIER;
  const directionsAttribuables = posteRequis ? directions : directions.filter((direction) => direction.est_operationnelle);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const payload = {
      name: formulaire.name,
      email: formulaire.email,
      role: formulaire.role,
      poste: posteRequis ? formulaire.poste : undefined,
      direction_id: directionRequise ? formulaire.direction_id || undefined : undefined,
    };
    if (formulaire.password) payload.password = formulaire.password;

    try {
      if (edition) {
        await updateUser(edition.id, payload);
      } else {
        await createUser(payload);
      }
      setFormulaire(FORMULAIRE_VIDE);
      setEdition(null);
      await charger();
    } catch (err) {
      setErreur(
        err.response?.data?.message ??
          Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
          "Échec de l'enregistrement.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  function commencerEdition(user) {
    setEdition(user);
    setFormulaire({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role === ROLES.RESPONSABLE_DIRECTION ? ROLES.DIRECTEUR_DIRECTION : user.role,
      poste: user.poste ?? '',
      direction_id: user.direction_id ?? '',
    });
  }

  async function supprimer(user) {
    const ok = await confirm({
      title: 'Supprimer ce compte ?',
      description: `Le compte de ${user.name} sera définitivement supprimé.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    await deleteUser(user.id);
    charger();
  }

  async function basculerDisponibiliteDg(user) {
    await updateDgDisponibilite(!user.dg_disponible);
    await charger();
  }

  async function revoquer(user) {
    const ok = await confirm({
      title: 'Révoquer toutes les sessions actives ?',
      description: `${user.name} devra se reconnecter sur tous ses appareils.`,
      confirmLabel: 'Révoquer',
      tone: 'danger',
    });
    if (!ok) return;
    await revokeUserTokens(user.id);
    setMessage(`Jetons de ${user.name} révoqués.`);
    setTimeout(() => setMessage(null), 4000);
  }

  return (
    <div>
      <PageHeader title="Gestion des comptes et des rôles" description="Création des comptes agents et contrôle des accès." />

      {message && <Alert tone="success" className="mb-4">{message}</Alert>}

      <Card className="mb-6">
        <CardHeader title={edition ? `Modifier ${edition.name}` : 'Nouveau compte'} />
        <CardBody>
          {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
          <form onSubmit={soumettre} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nom" htmlFor="name" required>
              <input
                id="name"
                className={inputClass}
                value={formulaire.name}
                onChange={(e) => setFormulaire((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="E-mail" htmlFor="email" required>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={formulaire.email}
                onChange={(e) => setFormulaire((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </Field>
            <Field
              label={edition ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
              htmlFor="password"
              required={!edition}
              hint="Min. 10 caractères, majuscule + minuscule + chiffre."
            >
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={formulaire.password}
                onChange={(e) => setFormulaire((f) => ({ ...f, password: e.target.value }))}
                required={!edition}
                minLength={10}
              />
            </Field>
            <Field label="Rôle" htmlFor="role">
              <select
                id="role"
                className={inputClass}
                value={formulaire.role}
                onChange={(e) => setFormulaire((f) => ({ ...f, role: e.target.value, poste: '', direction_id: '' }))}
              >
                {ROLES_ATTRIBUABLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            {posteRequis && (
              <Field label="Poste" htmlFor="poste" required>
                <select
                  id="poste"
                  className={inputClass}
                  value={formulaire.poste}
                  onChange={(e) => setFormulaire((f) => ({ ...f, poste: e.target.value }))}
                  required
                >
                  <option value="" disabled>
                    Choisir un poste
                  </option>
                  {Object.values(POSTES).map((p) => (
                    <option key={p} value={p}>
                      {POSTE_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {directionRequise && (
              <Field label="Direction" htmlFor="direction_id" required>
                <select
                  id="direction_id"
                  className={inputClass}
                  value={formulaire.direction_id}
                  onChange={(e) => setFormulaire((f) => ({ ...f, direction_id: e.target.value }))}
                  required
                >
                  <option value="" disabled>
                    Choisir une direction
                  </option>
                  {directionsAttribuables.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.nom}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={envoi}>
                {envoi ? 'Enregistrement…' : edition ? 'Enregistrer' : 'Créer'}
              </Button>
              {edition && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEdition(null);
                    setFormulaire(FORMULAIRE_VIDE);
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
          title={`Comptes (${usersFiltres.length})`}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <SearchBar value={recherche} onChange={setRecherche} placeholder="Rechercher par nom ou e-mail…" />
              <ExportButtons
                data={usersFiltres}
                filename="utilisateurs-ont"
                columns={[
                  { label: 'Nom', value: (u) => u.name },
                  { label: 'E-mail', value: (u) => u.email },
                  { label: 'Rôle', value: (u) => u.role_label },
                  { label: 'Poste', value: (u) => u.poste_label ?? '' },
                  { label: 'Direction', value: (u) => u.direction?.code ?? '' },
                ]}
              />
            </div>
          }
        />
        <CardBody className="p-0">
          <AnnonceChargement chargement={chargement} count={usersFiltres.length} libelle="utilisateur(s)" />
          <TableWrap>
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Nom</th>
                  <th className={thClass}>E-mail</th>
                  <th className={thClass}>Rôle</th>
                  <th className={thClass}>Poste</th>
                  <th className={thClass}>Direction</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {chargement ? (
                  <SkeletonRows colonnes={6} />
                ) : (
                  usersFiltres.map((u) => (
                    <tr key={u.id} className={trHoverClass}>
                      <td className={tdClassPremiere}>{u.name}</td>
                      <td className={tdClass}>{u.email}</td>
                      <td className={tdClass}>
                        <Badge tone="info">{u.role_label}</Badge>
                      </td>
                      <td className={tdClass}>{u.poste_label ?? '—'}</td>
                      <td className={tdClass}>{u.direction?.code ?? '—'}</td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => commencerEdition(u)}>
                            Modifier
                          </Button>
                          {u.poste === 'dg' && (
                            <Button type="button" variant="secondary" size="sm" onClick={() => basculerDisponibiliteDg(u)}>
                              {u.dg_disponible ? 'Marquer indisponible' : 'Marquer disponible'}
                            </Button>
                          )}
                          <Button type="button" variant="secondary" size="sm" onClick={() => revoquer(u)}>
                            Révoquer jetons
                          </Button>
                          <Button type="button" variant="danger" size="sm" onClick={() => supprimer(u)}>
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
        </CardBody>
      </Card>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
