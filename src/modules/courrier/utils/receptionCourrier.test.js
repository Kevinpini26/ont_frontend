import { describe, expect, it } from 'vitest';
import { depotPublicDejaTransmis, identiteCourrier, messageErreurReception, peutReceptionnerBordereau } from './receptionCourrier';

describe('réception des courriers', () => {
  it('réserve la décharge au destinataire réel du bordereau', () => {
    const courrier = {
      en_transit: true,
      transitions: [{ destinataire_poste: 'secretariat_1', destinataire_user_id: null, accuse_reception_at: null }],
    };

    expect(peutReceptionnerBordereau(courrier, { poste: 'reception' })).toBe(false);
    expect(peutReceptionnerBordereau(courrier, { poste: 'secretariat_1' })).toBe(true);
  });

  it('retire de la file Réception un dépôt public déjà transmis à SEC1', () => {
    expect(
      depotPublicDejaTransmis({
        mode_reception: 'depot_en_ligne',
        statut: 'recu',
        transitions: [{ destinataire_poste: 'secretariat_1' }],
      }),
    ).toBe(true);
  });

  it('privilégie le numéro institutionnel d’un courrier physique sans AR public', () => {
    expect(identiteCourrier({ id: 8, numero_accuse_reception: null, numero_enregistrement: 'ONT/2026/0008' })).toBe('ONT/2026/0008');
  });

  it('traduit les erreurs sans exposer de détails techniques', () => {
    expect(messageErreurReception({ response: { status: 422, data: { errors: { objet: ['Objet requis.'] } } } })).toBe('Objet requis.');
    expect(messageErreurReception({ response: { status: 403 } })).toContain('pas autorisé');
    expect(messageErreurReception({ response: { status: 413 } })).toContain('taille autorisée');
    expect(messageErreurReception({ response: { status: 500, data: { message: 'Stack trace secrète' } } })).not.toContain('Stack trace');
    expect(messageErreurReception(new Error('Network Error'))).toContain('Impossible de contacter le serveur');
  });
});
