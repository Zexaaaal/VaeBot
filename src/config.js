module.exports = {
  TARGET_CHANNEL_ID: "1476711679617138840",
  QI_ROLE_ID: "1476711743156649994",
  ALLOWED_GUILD_ID: "1395734787053850688",
  OWNER_ID: "219581513119825931",
  MALUS_LIST: [
    { label: "Bruits de bouches", value: "malus_bruits_bouche", points: -10 },
    { label: "Tics de langage répétés", value: "malus_tics_langage", points: -5 },
    { label: "Rots & Pets", value: "malus_rots", points: -7 },
    { label: "Remarque stupide", value: "malus_remarque_stupide", points: -10 },
    { label: "Utilisation de l'IA pour une tâche simple", value: "malus_ia_simple", points: -15 },
    { label: "Histoire trop longue, monologue, yapping", value: "malus_yapping", points: -20 },
  ],
  BONUS_LIST: [
    { label: "Compliment", value: "bonus_compliment", points: 10 },
    { label: "Admet ses erreurs", value: "bonus_admet_erreur", points: 15 },
    { label: "A aidé quelqu'un", value: "bonus_aide", points: 10 },
    { label: "A fait rire tout le monde", value: "bonus_rire", points: 20 }
  ],
  DAILY_ROLL_EVENTS: [
    { label: "A ouvert ses volets", points: 20 },
    { label: "Buff du Dieu Volt", points: 15 },
    { label: "A pensé à roll", points: 10 },
    { label: "A fait une bonne action", points: 10 },
    { label: "S'est pas lavé les mains", points: -5 },
    { label: "Ne s'est pas lavé les mains", points: -5 },
    { label: "N'a pas complété ses weeklies sur Warframe", points: -10 },
    { label: "Joue Saryn", points: -15 },
    { label: "Dit si j'aurais trop souvent", points: -20 }
  ]
};
