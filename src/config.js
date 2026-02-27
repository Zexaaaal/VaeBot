module.exports = {
  TARGET_CHANNEL_ID: "1476711679617138840",
  QI_ROLE_ID: "1476711743156649994",
  MALUS_LIST: [
    { label: "Bruits de bouches", value: "malus_bruits_bouche", points: -10 },
    { label: "Tics de langage répétés", value: "malus_tics_langage", points: -5 },
    { label: "Rots", value: "malus_rots", points: -7 },
    { label: "Pets", value: "malus_pets", points: -3 },
    { label: "Élément de culture général manquant", value: "malus_culture_g", points: -15 },
    { label: "Utilisation de l'IA pour une tâche simple", value: "malus_ia_simple", points: -20 }
  ],
  BONUS_LIST: [
    { label: "Compliment", value: "bonus_compliment", points: 10 },
    { label: "Admet ses erreurs", value: "bonus_admet_erreur", points: 15 }
  ],
  DAILY_ROLL_EVENTS: [
    { label: "Illumination divine !", points: 15 },
    { label: "Bonne nuit de sommeil", points: 5 },
    { label: "A lu un livre intéressant", points: 10 },
    { label: "S'est cogné l'orteil", points: -5 },
    { label: "A oublié ses clés", points: -10 },
    { label: "A scrollé TikTok pendant 3h", points: -15 }
  ]
};
