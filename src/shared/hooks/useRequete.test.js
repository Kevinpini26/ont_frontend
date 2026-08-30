import { describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRequete } from './useRequete';

describe('useRequete', () => {
  test('charge les donnees et desactive chargement une fois la promesse resolue', async () => {
    const fetcher = vi.fn().mockResolvedValue({ valeur: 42 });

    const { result } = renderHook(() => useRequete(fetcher, []));

    expect(result.current.chargement).toBe(true);

    await waitFor(() => expect(result.current.chargement).toBe(false));

    expect(result.current.donnees).toEqual({ valeur: 42 });
    expect(result.current.erreur).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('expose lerreur quand le fetcher echoue', async () => {
    const echec = new Error('panne réseau');
    const fetcher = vi.fn().mockRejectedValue(echec);

    const { result } = renderHook(() => useRequete(fetcher, []));

    await waitFor(() => expect(result.current.chargement).toBe(false));

    expect(result.current.erreur).toBe(echec);
    expect(result.current.donnees).toBeNull();
  });

  test('ignore une erreur dannulation (ERR_CANCELED) plutot que de lafficher', async () => {
    const annulee = Object.assign(new Error('annulée'), { code: 'ERR_CANCELED' });
    const fetcher = vi.fn().mockRejectedValue(annulee);

    const { result } = renderHook(() => useRequete(fetcher, []));

    await waitFor(() => expect(result.current.chargement).toBe(false));

    expect(result.current.erreur).toBeNull();
  });

  test('recharger relance le fetcher et renvoie une promesse attendable', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ valeur: 1 }).mockResolvedValueOnce({ valeur: 2 });

    const { result } = renderHook(() => useRequete(fetcher, []));

    await waitFor(() => expect(result.current.donnees).toEqual({ valeur: 1 }));

    await act(async () => {
      await result.current.recharger();
    });

    expect(result.current.donnees).toEqual({ valeur: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test('une reponse perimee (requete abandonnee) necrase jamais un resultat plus recent', async () => {
    // Le premier appel ne se résout qu'après le second : sans annulation,
    // il écraserait le résultat déjà affiché avec une donnée obsolète.
    let resoudrePremierAppel;
    const premierAppel = new Promise((resolve) => {
      resoudrePremierAppel = resolve;
    });

    const fetcher = vi.fn().mockReturnValueOnce(premierAppel).mockResolvedValueOnce({ valeur: 'recent' });

    const { result, rerender } = renderHook(({ deps }) => useRequete(fetcher, deps), {
      initialProps: { deps: [1] },
    });

    rerender({ deps: [2] });

    await waitFor(() => expect(result.current.donnees).toEqual({ valeur: 'recent' }));

    await act(async () => {
      resoudrePremierAppel({ valeur: 'perime' });
      await Promise.resolve();
    });

    expect(result.current.donnees).toEqual({ valeur: 'recent' });
  });
});
