import { apiClient } from '../../../shared/api/client';

export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function fetchMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.data;
}

export async function changerMotDePasse(ancienMotDePasse, motDePasse, motDePasseConfirmation) {
  const { data } = await apiClient.post('/auth/mot-de-passe/changer', {
    ancien_mot_de_passe: ancienMotDePasse,
    mot_de_passe: motDePasse,
    mot_de_passe_confirmation: motDePasseConfirmation,
  });
  return data;
}

export async function demanderReinitialisationMotDePasse(email) {
  const { data } = await apiClient.post('/auth/mot-de-passe/oublie', { email });
  return data;
}

export async function reinitialiserMotDePasse(email, token, motDePasse, motDePasseConfirmation) {
  const { data } = await apiClient.post('/auth/mot-de-passe/reinitialiser', {
    email,
    token,
    mot_de_passe: motDePasse,
    mot_de_passe_confirmation: motDePasseConfirmation,
  });
  return data;
}
