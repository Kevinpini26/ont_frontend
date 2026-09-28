import { useEffect, useState } from 'react';
import { deciderDispatch } from '../api/courrierApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';

const vide = () => ({ type: 'direction', direction_id: '', destinataire_externe_nom: '', destinataire_externe_email: '', instruction: '' });

export function DispatchDecisionPanel({ courrier, user, onUpdate }) {
  const [destinations, setDestinations] = useState([vide()]);
  const [directions, setDirections] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => { listDirections().then(setDirections); }, []);

  const peutDecider = courrier.peut_ouvrir_nouveau_cycle && Boolean(user.source_autorite_dg);
  if (!peutDecider && !(courrier.dispatchs?.length > 0)) return null;

  function modifier(index, cle, valeur) {
    setDestinations((actuelles) => actuelles.map((item, i) => i === index ? { ...item, [cle]: valeur } : item));
  }

  async function valider() {
    setEnCours(true); setErreur(null);
    try {
      const payload = destinations.map((item) => ({
        type: item.type,
        direction_id: item.type === 'direction' ? Number(item.direction_id) : null,
        destinataire_externe_nom: item.type === 'exterieur' ? item.destinataire_externe_nom : null,
        destinataire_externe_email: item.type === 'exterieur' ? item.destinataire_externe_email || null : null,
        instruction: item.instruction,
      }));
      onUpdate(await deciderDispatch(courrier.id, payload));
    } catch (e) { setErreur(e.response?.data?.message ?? 'Décision impossible.'); }
    finally { setEnCours(false); }
  }

  return (
    <Card>
      <CardHeader title="Dispatch institutionnel" description="La DG/DGA décide ; le Secrétariat 02 exécute chaque destination indépendamment." />
      <CardBody className="space-y-4">
        {courrier.dispatchs?.map((dispatch) => (
          <div key={dispatch.id} className="rounded-field border border-border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span>Cycle {dispatch.cycle} · {dispatch.type_destination_label} — {dispatch.direction?.nom ?? dispatch.destinataire_externe_nom ?? 'Classement'}</span><Badge tone={dispatch.statut === 'execute' ? 'success' : 'warning'}>{dispatch.statut_label}</Badge></div>
            {dispatch.traitement_direction && <ol className="mt-2 space-y-1 text-text-subtle"><li>SEC2 a exécuté le dispatch</li><li>Secrétariat : {dispatch.traitement_direction.recu_secretariat_at ? 'reçu' : 'en attente'}</li><li>Directeur : {dispatch.traitement_direction.statut_label}</li>{dispatch.traitement_direction.decision_directeur_label && <li>Décision : {dispatch.traitement_direction.decision_directeur_label}</li>}</ol>}
          </div>
        ))}
        {peutDecider && destinations.map((destination, index) => (
          <div key={index} className="space-y-3 rounded-field border border-border p-4">
            <Field label={`Destination ${index + 1}`}>
              <select className={inputClass} value={destination.type} onChange={(e) => modifier(index, 'type', e.target.value)}>
                <option value="direction">Direction interne</option><option value="exterieur">Destinataire extérieur</option><option value="classement">Classement</option>
              </select>
            </Field>
            {destination.type === 'direction' && <Field label="Direction" required><select className={inputClass} value={destination.direction_id} onChange={(e) => modifier(index, 'direction_id', e.target.value)}><option value="">Choisir</option>{directions.filter((d) => d.est_operationnelle).map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}</select></Field>}
            {destination.type === 'exterieur' && <div className="grid gap-3 md:grid-cols-2"><Field label="Destinataire" required><input className={inputClass} value={destination.destinataire_externe_nom} onChange={(e) => modifier(index, 'destinataire_externe_nom', e.target.value)} /></Field><Field label="Courriel"><input type="email" className={inputClass} value={destination.destinataire_externe_email} onChange={(e) => modifier(index, 'destinataire_externe_email', e.target.value)} /></Field></div>}
            <Field label="Instruction" required><textarea className={inputClass} rows={2} value={destination.instruction} onChange={(e) => modifier(index, 'instruction', e.target.value)} /></Field>
            {destinations.length > 1 && <Button variant="ghost" onClick={() => setDestinations((d) => d.filter((_, i) => i !== index))}>Retirer</Button>}
          </div>
        ))}
        {erreur && <p className="text-sm text-danger">{erreur}</p>}
        {peutDecider && <div className="flex gap-2"><Button variant="secondary" onClick={() => setDestinations((d) => [...d, vide()])}>Ajouter une destination</Button><Button loading={enCours} disabled={destinations.some((d) => !d.instruction.trim())} onClick={valider}>Transmettre à SEC2</Button></div>}
      </CardBody>
    </Card>
  );
}
