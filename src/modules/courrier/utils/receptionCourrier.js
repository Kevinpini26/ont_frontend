export function messageErreurReception(error) {
  const statut = error?.response?.status;

  if (statut === 422) {
    const erreurs = error.response?.data?.errors;
    const premiereErreur = erreurs && Object.values(erreurs).flat().find(Boolean);
    return premiereErreur ?? error.response?.data?.message ?? 'Les informations saisies sont invalides.';
  }
  if (statut === 403) return "Vous n'êtes pas autorisé à enregistrer ce courrier.";
  if (statut === 413) return 'Le fichier dépasse la taille autorisée.';
  if (statut >= 500) return "Le serveur n'a pas pu enregistrer le courrier. Réessayez ultérieurement.";
  if (!error?.response) return 'Impossible de contacter le serveur. Vérifiez la connexion puis réessayez.';

  return error.response?.data?.message ?? "Le courrier n'a pas pu être enregistré.";
}

export function transitionCourante(courrier) {
  const transitions = courrier?.transitions ?? [];
  return transitions.length > 0 ? transitions[transitions.length - 1] : null;
}

export function peutReceptionnerBordereau(courrier, user) {
  if (!courrier?.en_transit) return false;

  const transition = transitionCourante(courrier);
  if (!transition || transition.accuse_reception_at) return false;

  if (transition.destinataire_user_id) return transition.destinataire_user_id === user?.id;
  return transition.destinataire_poste === user?.poste;
}

export function depotPublicDejaTransmis(courrier) {
  return (
    courrier?.mode_reception === 'depot_en_ligne' &&
    courrier?.statut === 'recu' &&
    (courrier.transitions ?? []).some((transition) => transition.destinataire_poste === 'secretariat_1')
  );
}

export function identiteCourrier(courrier) {
  return (
    courrier?.numero_depart ??
    courrier?.numero_enregistrement ??
    courrier?.reference_documentaire ??
    courrier?.numero_accuse_reception ??
    `Courrier #${courrier?.id ?? '—'}`
  );
}

export function libelleReferenceDocument(courrier) {
  if (courrier?.numero_depart) return `Départ ${courrier.numero_depart}`;
  if (courrier?.numero_enregistrement) return `Enreg. ${courrier.numero_enregistrement}`;
  if (courrier?.reference_documentaire) return `Réf. ${courrier.reference_documentaire}`;
  if (courrier?.numero_accuse_reception) return `Accusé ${courrier.numero_accuse_reception}`;
  return `Courrier #${courrier?.id ?? '—'}`;
}
