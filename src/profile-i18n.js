// "Who's baking?" panel copy (EN, Austrian DE with du, FR): add, rename and
// delete profiles. Loaded lazily with src/ProfilePanel.jsx.
export const profileText = {
  en: {
    add: 'Add someone',
    rename: 'Rename',
    remove: 'Delete',
    nameLabel: 'Name',
    save: 'Save',
    cancel: 'Cancel',
    keep: 'Keep',
    editChip: (name, canDelete) => (canDelete ? `${name} \u2014 rename or delete` : `${name} \u2014 rename`),
    confirm: (name) => `Delete ${name}? Their hearts and baked counts go too.`,
    now: (name) => `Now baking: ${name}`,
    removed: (name) => `${name} deleted`,
  },
  de: {
    add: 'Jemand Neuer',
    rename: 'Umbenennen',
    remove: 'Löschen',
    nameLabel: 'Name',
    save: 'Speichern',
    cancel: 'Abbrechen',
    keep: 'Behalten',
    editChip: (name, canDelete) => (canDelete ? `${name} \u2014 umbenennen oder löschen` : `${name} \u2014 umbenennen`),
    confirm: (name) => `${name} löschen? Die Herzen und Backzähler sind dann auch weg.`,
    now: (name) => `Jetzt am Backen: ${name}`,
    removed: (name) => `${name} gelöscht`,
  },
  fr: {
    add: 'Ajouter quelqu’un',
    rename: 'Renommer',
    remove: 'Supprimer',
    nameLabel: 'Prénom',
    save: 'Enregistrer',
    cancel: 'Annuler',
    keep: 'Garder',
    editChip: (name, canDelete) => (canDelete ? `${name} \u2014 renommer ou supprimer` : `${name} \u2014 renommer`),
    confirm: (name) => `Supprimer ${name} ? Ses favoris et compteurs disparaissent aussi.`,
    now: (name) => `En cuisine : ${name}`,
    removed: (name) => `${name} : supprimé`,
  },
};

export const profileCopyFor = (lang) => profileText[lang] || profileText.en;
