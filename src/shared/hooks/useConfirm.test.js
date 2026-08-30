import { describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConfirm } from './useConfirm';

describe('useConfirm', () => {
  test('confirm() ouvre la boite de dialogue avec les options fournies', () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({ title: 'Supprimer ?', description: 'Action irréversible.', tone: 'danger' });
    });

    expect(result.current.dialogProps.open).toBe(true);
    expect(result.current.dialogProps.title).toBe('Supprimer ?');
    expect(result.current.dialogProps.description).toBe('Action irréversible.');
    expect(result.current.dialogProps.tone).toBe('danger');
  });

  test('le ton par defaut est primary quand il nest pas precise', () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({ title: 'Continuer ?' });
    });

    expect(result.current.dialogProps.tone).toBe('primary');
  });

  test('onConfirm resout la promesse a vrai et referme la boite', async () => {
    const { result } = renderHook(() => useConfirm());

    let promesse;
    act(() => {
      promesse = result.current.confirm({ title: 'Confirmer ?' });
    });

    act(() => {
      result.current.dialogProps.onConfirm();
    });

    await expect(promesse).resolves.toBe(true);
    expect(result.current.dialogProps.open).toBe(false);
  });

  test('onCancel resout la promesse a faux et referme la boite', async () => {
    const { result } = renderHook(() => useConfirm());

    let promesse;
    act(() => {
      promesse = result.current.confirm({ title: 'Confirmer ?' });
    });

    act(() => {
      result.current.dialogProps.onCancel();
    });

    await expect(promesse).resolves.toBe(false);
    expect(result.current.dialogProps.open).toBe(false);
  });

  test('un second appel a confirm() remplace les options du premier', () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm({ title: 'Premier' });
    });
    act(() => {
      result.current.confirm({ title: 'Second' });
    });

    expect(result.current.dialogProps.title).toBe('Second');
  });
});
