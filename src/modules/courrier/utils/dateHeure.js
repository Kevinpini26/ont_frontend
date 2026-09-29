export function formaterDateHeure(valeur, timeZone) {
  if (valeur === null || valeur === undefined || valeur === '') return null;

  const date = valeur instanceof Date ? valeur : new Date(valeur);
  if (!Number.isFinite(date.getTime())) return null;

  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  if (timeZone) options.timeZone = timeZone;

  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}