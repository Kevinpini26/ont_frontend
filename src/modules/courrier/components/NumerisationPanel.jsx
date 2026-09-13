import { useState } from 'react';
import { Eye, QrCode } from 'lucide-react';
import { genererJetonCapture } from '../api/courrierApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Alert } from '../../../shared/components/ui/Alert';
import { Modal } from '../../../shared/components/ui/Modal';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';

const STATUT_TONE = {
  numerise: 'success',
  a_numeriser: 'warning',
  non_applicable: undefined,
};

/**
 * Comment un document papier entre dans le système (voir
 * docs/numerisation-courrier.md) : génère un lien/QR de capture mobile à
 * usage unique (Lot 1) et liste les versions déjà numérisées. La Réception
 * numérise (ou l'administrateur, en dépannage) — pas les autres postes,
 * qui n'ont ici qu'un rôle de consultation.
 */
export function NumerisationPanel({ courrier }) {
  const user = useAuthStore((s) => s.user);
  const [jeton, setJeton] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [apercu, setApercu] = useState(null);
  const [lienCopie, setLienCopie] = useState(false);

  const peutNumeriser = user.poste === 'reception' || user.role === 'administrateur';
  const numerisations = courrier.numerisations ?? [];

  if (!peutNumeriser && numerisations.length === 0 && courrier.numerisation_statut === 'non_applicable') return null;

  async function genererLien() {
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await genererJetonCapture(courrier.id);
      setJeton(reponse);
      setLienCopie(false);
    } catch (err) {
      setErreur(err.response?.data?.message || 'Impossible de générer le lien.');
    } finally {
      setEnCours(false);
    }
  }

  async function copierLien() {
    await navigator.clipboard.writeText(jeton.url);
    setLienCopie(true);
  }

  return (
    <Card>
      <CardHeader title="Numérisation" description="Comment ce document papier entre dans le système." />
      <CardBody className="space-y-4">
        {courrier.numerisation_statut && (
          <p className="flex items-center gap-2 text-sm">
            <span className="font-medium text-text">Statut : </span>
            <Badge tone={STATUT_TONE[courrier.numerisation_statut]}>{courrier.numerisation_statut_label}</Badge>
          </p>
        )}

        {numerisations.length > 0 && (
          <ul className="space-y-2">
            {numerisations.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-field bg-surface-sunken px-3 py-2 text-sm">
                <span className="text-text-muted">
                  Version {doc.version} — {doc.source_label}
                  {doc.qualite_label && <> — {doc.qualite_label}</>}
                  {doc.capture_par && <> — par {doc.capture_par}</>}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setApercu({
                      title: `Numérisation — version ${doc.version}`,
                      url: `/courriers/${courrier.id}/numerisations/${doc.id}`,
                      downloadFilename: `numerisation-${courrier.numero_accuse_reception}-v${doc.version}.pdf`,
                    })
                  }
                >
                  <Eye size={16} />
                  Voir
                </Button>
              </li>
            ))}
          </ul>
        )}

        {erreur && <Alert tone="error">{erreur}</Alert>}

        {peutNumeriser && (
          <Button type="button" variant="secondary" disabled={enCours} onClick={genererLien}>
            <QrCode size={16} />
            {enCours ? 'Génération…' : 'Générer un lien de capture mobile'}
          </Button>
        )}
      </CardBody>

      <Modal open={jeton !== null} onClose={() => setJeton(null)} title="Lien de capture mobile" size="sm">
        {jeton && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-text-muted">
              À scanner avec le téléphone qui va photographier le document — valable jusqu'à{' '}
              {new Date(jeton.expire_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}, à usage unique.
            </p>
            <img src={jeton.qr_code_data_uri} alt="QR code de capture" className="h-48 w-48" />
            <div className="flex w-full items-center gap-2">
              <input readOnly value={jeton.url} className="w-full truncate rounded-field border border-border bg-surface-sunken px-3 py-2 text-xs text-text-muted" />
              <Button type="button" variant="secondary" size="sm" onClick={copierLien}>
                {lienCopie ? 'Copié !' : 'Copier'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <DocumentPreviewModal
        open={apercu !== null}
        onClose={() => setApercu(null)}
        title={apercu?.title ?? ''}
        url={apercu?.url}
        downloadFilename={apercu?.downloadFilename}
      />
    </Card>
  );
}
