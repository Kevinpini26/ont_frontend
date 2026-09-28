import { useEffect, useState } from 'react';
import { getDgAutorite } from '../api/dgDisponibiliteApi';

export function useDgAutorite(active = true) {
  const [source, setSource] = useState(undefined);

  useEffect(() => {
    if (!active) return undefined;
    let actif = true;
    getDgAutorite()
      .then((etat) => { if (actif) setSource(etat.source_autorite); })
      .catch(() => { if (actif) setSource(null); });
    return () => { actif = false; };
  }, [active]);

  return source;
}
