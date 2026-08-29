import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Nécessaire explicitement avec Vitest (contrairement à Jest, où
// @testing-library/react s'auto-enregistre) : sans ça, chaque composant
// rendu par un test reste monté pour les suivants, et les requêtes
// getBy*/queryBy* peuvent trouver — ou échouer à trouver — le mauvais
// élément selon l'ordre d'exécution.
afterEach(cleanup);
