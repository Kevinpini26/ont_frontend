import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { creerDocumentProduit, deciderTraitementDirection, demanderCorrectionDocumentProduit, listTraitementsDirection, prendreTraitementEnCharge, soumettreDocumentProduit, transmettreDocumentReception, validerDocumentProduit } from '../api/courrierApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function TraitementsDirectionPage() {
  const [traitements, setTraitements] = useState(null);
  const [saisie, setSaisie] = useState({});
  const user = useAuthStore((s) => s.user);
  const charger = async () => setTraitements(await listTraitementsDirection());
  useEffect(() => { charger(); }, []);
  if (!traitements) return <LoadingBlock />;

  return <div><PageHeader title="Courriers à traiter" description="Documents transmis nominativement par le secrétariat de votre direction." />
    {traitements.length === 0 ? <EmptyState title="Aucun courrier à traiter" /> : <div className="space-y-4">{traitements.map((t) => <Card key={t.id}><CardBody className="space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><div><Link className="font-semibold text-primary hover:underline" to={`/courriers/${t.courrier_id}`}>{t.courrier?.objet}</Link><p className="text-sm text-text-subtle">{t.courrier?.numero_enregistrement} · Dossier {t.dossier_id}</p></div><Badge tone={t.statut === 'termine_directeur' ? 'success' : 'warning'}>{t.statut_label}</Badge></div>
      <p className="text-sm"><span className="font-medium">Instruction DG/DGA :</span> {t.dispatch?.instruction}</p>
      {t.note_transmission && <p className="text-sm"><span className="font-medium">Note du secrétariat :</span> {t.note_transmission}</p>}
      {t.statut === 'transmis_directeur' && <Button onClick={async () => { await prendreTraitementEnCharge(t.id); await charger(); }}>Prendre en charge</Button>}
      {t.statut === 'en_traitement' && <div className="space-y-3"><Field label="Décision"><select className={inputClass} value={saisie[t.id]?.decision ?? 'traitement_termine'} onChange={(e) => setSaisie((s) => ({ ...s, [t.id]: { ...s[t.id], decision: e.target.value } }))}><option value="traitement_termine">Traitement terminé</option><option value="retour_a_preparer">Retour à préparer</option><option value="autre">Autre</option></select></Field><Field label="Commentaire"><textarea className={inputClass} value={saisie[t.id]?.commentaire ?? ''} onChange={(e) => setSaisie((s) => ({ ...s, [t.id]: { ...s[t.id], commentaire: e.target.value } }))} /></Field><Button disabled={(saisie[t.id]?.decision === 'autre') && !saisie[t.id]?.commentaire?.trim()} onClick={async () => { await deciderTraitementDirection(t.id, saisie[t.id]?.decision ?? 'traitement_termine', saisie[t.id]?.commentaire); await charger(); }}>Enregistrer la décision</Button></div>}
      {t.decision_directeur && <p className="text-sm"><span className="font-medium">Décision finale :</span> {t.decision_directeur_label}{t.commentaire_directeur ? ` — ${t.commentaire_directeur}` : ''}</p>}
      {t.statut === 'termine_directeur' && t.decision_directeur === 'retour_a_preparer' && !t.document_produit && user.role === 'secretariat_direction' && <div className="space-y-2"><Field label="Objet du document de retour"><input className={inputClass} value={saisie[t.id]?.objet ?? ''} onChange={(e) => setSaisie((s) => ({ ...s, [t.id]: { ...s[t.id], objet: e.target.value } }))} /></Field><Field label="Contenu"><textarea className={inputClass} value={saisie[t.id]?.texte ?? ''} onChange={(e) => setSaisie((s) => ({ ...s, [t.id]: { ...s[t.id], texte: e.target.value } }))} /></Field><Button onClick={async () => { await creerDocumentProduit(t.id, saisie[t.id]?.objet, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: saisie[t.id]?.texte }] }] }); await charger(); }}>Préparer le document de retour</Button></div>}
      {t.document_produit && <div className="space-y-2 rounded-field border border-border p-3"><div className="flex justify-between"><span className="font-medium">Document produit : {t.document_produit.courrier?.objet}</span><Badge>{t.document_produit.statut_label}</Badge></div>{t.document_produit.courrier?.reference_documentaire && <p className="text-sm">Référence : {t.document_produit.courrier.reference_documentaire}</p>}{user.role === 'secretariat_direction' && ['brouillon', 'a_corriger'].includes(t.document_produit.statut) && <Button onClick={async () => { await soumettreDocumentProduit(t.document_produit.id); await charger(); }}>Soumettre au Directeur</Button>}{user.role !== 'secretariat_direction' && t.document_produit.statut === 'soumis_directeur' && <div className="flex gap-2"><Button variant="secondary" onClick={async () => { await demanderCorrectionDocumentProduit(t.document_produit.id, 'Document à corriger'); await charger(); }}>Demander correction</Button><Button onClick={async () => { await validerDocumentProduit(t.document_produit.id); await charger(); }}>Valider et référencer</Button></div>}{user.role === 'secretariat_direction' && t.document_produit.statut === 'valide' && <Button onClick={async () => { await transmettreDocumentReception(t.document_produit.id); await charger(); }}>Transmettre à Réception</Button>}</div>}
    </CardBody></Card>)}</div>}
  </div>;
}
