// Même règle que slugNom() dans public/api/espace.php : « Léa Martin » → « lea-martin »
export const slugNom = (s: string) =>
  s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
