import type { CanonicalCard, TarotSuit } from "@/types/domain";

interface MarseilleMajorSeed {
  rank: number;
  roman: string;
  nameEs: string;
  nameFr: string;
  nameEn: string;
  slug: string;
  upright: string;
  reversed: string;
  keywords: string[];
  archetype: string;
}

const MARSEILLE_MAJOR_SEED: MarseilleMajorSeed[] = [
  {
    rank: 0,
    roman: "",
    nameEs: "El Loco (Le Mat)",
    nameFr: "Le Mat",
    nameEn: "The Fool",
    slug: "marseille-00-le-mat",
    upright: "Tránsito puro sin ataduras, energía primordial en marcha antes de definirse.",
    reversed: "Pérdida de suelo, huida compulsiva o dispersión energética sin destino.",
    keywords: ["tránsito", "libertad", "impulso nómade", "potencia pura"],
    archetype: "El peregrino con fardo y bastón empujado por el animal.",
  },
  {
    rank: 1,
    roman: "I",
    nameEs: "El Mago (Le Bateleur)",
    nameFr: "Le Bateleur",
    nameEn: "The Magician",
    slug: "marseille-01-le-bateleur",
    upright: "Juego de posibilidades, inicio diestro, elementos sobre la mesa dispuestos a combinarse.",
    reversed: "Artificio engañoso, indecisión ante la multiplicidad o trampa de feria.",
    keywords: ["inicio", "destreza", "recursos", "mesa de juego"],
    archetype: "El artesano ante su mesa de tres patas con sombrero de infinito.",
  },
  {
    rank: 2,
    roman: "II",
    nameEs: "La Papisa (La Papesse)",
    nameFr: "La Papesse",
    nameEn: "The Popess",
    slug: "marseille-02-la-papesse",
    upright: "Gestación secreta, estudio del libro sagrado en claustro, paciencia y reserva.",
    reversed: "Silencio hostil, rigidez moral o encierro doctrinario sin transmisión.",
    keywords: ["gestación", "claustro", "libro", "secreto"],
    archetype: "La mujer entronizada con tiara que sostiene el libro abierto sin mirarlo.",
  },
  {
    rank: 3,
    roman: "III",
    nameEs: "La Emperatriz (L'Impératrice)",
    nameFr: "L'Impératrice",
    nameEn: "The Empress",
    slug: "marseille-03-limperatrice",
    upright: "Brote primaveral, palabra viva que fecunda, expansión entusiasta y belleza.",
    reversed: "Vanidad superficial, verborragia estéril o descuido de lo fundado.",
    keywords: ["fecundidad", "palabra", "brote", "entusiasmo"],
    archetype: "La soberana alada con cetro y escudo del águila mirando de frente.",
  },
  {
    rank: 4,
    roman: "IV",
    nameEs: "El Emperador (L'Empereur)",
    nameFr: "L'Empereur",
    nameEn: "The Emperor",
    slug: "marseille-04-lempereur",
    upright: "Asiento firme en la materia, consolidación terrenal, ley y protección cuadrangular.",
    reversed: "Inflexibilidad tiránica, abuso de fuerza o estructura anquilosada.",
    keywords: ["asiento", "ley", "estabilidad", "protección"],
    archetype: "El hombre de perfil con piernas cruzadas afirmado en el cubo de piedra.",
  },
  {
    rank: 5,
    roman: "V",
    nameEs: "El Papa (Le Pape)",
    nameFr: "Le Pape",
    nameEn: "The Pope",
    slug: "marseille-05-le-pape",
    upright: "Bendición que religa, enseñanza de maestros, mediación espiritual entre cielo y tierra.",
    reversed: "Dogmatismo sectario, abuso espiritual o imposición moralista.",
    keywords: ["bendición", "mediación", "enseñanza", "puente"],
    archetype: "La cruz papal triple y los dos discípulos en diálogo de escucha.",
  },
  {
    rank: 6,
    roman: "VI",
    nameEs: "Los Enamorados (L'Amoureux)",
    nameFr: "L'Amoureux",
    nameEn: "The Lovers",
    slug: "marseille-06-lamoureux",
    upright: "Doble atracción del corazón, encrucijada de deseos y despertar de la vocación.",
    reversed: "Duda paranoica, triangulación afectiva o postergación de la opción.",
    keywords: ["encrucijada", "deseo", "afinidad", "elección"],
    archetype: "El joven entre dos figuras femeninas bajo el arco de Cupido.",
  },
  {
    rank: 7,
    roman: "VII",
    nameEs: "El Carro (Le Chariot)",
    nameFr: "Le Chariot",
    nameEn: "The Chariot",
    slug: "marseille-07-le-chariot",
    upright: "Triunfo en el mundo, tracción armónica sobre el territorio, conquista activa.",
    reversed: "Descarrilamiento por soberbia, choque de fuerzas o victoria hueca.",
    keywords: ["triunfo", "tracción", "conquista", "movimiento"],
    archetype: "El príncipe coronado en su carro cubierto guiando caballos rojo y azul.",
  },
  {
    rank: 8,
    roman: "VIII",
    nameEs: "La Justicia (La Justice)",
    nameFr: "La Justice",
    nameEn: "Justice",
    slug: "marseille-08-la-justice",
    upright: "Ponderación exacta de pesos y medidas, ajuste según la ley cósmica, corte lúcido.",
    reversed: "Injusticia evidente, frialdad burocrática o rigor vengativo.",
    keywords: ["balanza", "ajuste", "rigor", "equilibrio"],
    archetype: "La balanza y la espada vertical en el grado VIII histórico de Marsella.",
  },
  {
    rank: 9,
    roman: "IX",
    nameEs: "El Ermitaño (L'Hermite)",
    nameFr: "L'Hermite",
    nameEn: "The Hermit",
    slug: "marseille-09-lhermite",
    upright: "Paso lento hacia atrás para mirar el camino, linterna cubierta, soledad fecunda.",
    reversed: "Senilidad amarga, miedo al futuro o misantropía cerrada.",
    keywords: ["prudencia", "linterna", "paso medido", "tiempo"],
    archetype: "El anciano encapuchado que alumbra el suelo con discreción.",
  },
  {
    rank: 10,
    roman: "X",
    nameEs: "La Rueda de la Fortuna (La Roue de Fortune)",
    nameFr: "La Roue de Fortune",
    nameEn: "Wheel of Fortune",
    slug: "marseille-10-la-roue-de-fortune",
    upright: "Final de un ciclo y comienzo del siguiente, manivela que aguarda una mano que la gire.",
    reversed: "Bloqueo cíclico, repetición de viejos patrones o resistencia al giro.",
    keywords: ["ciclo", "mutación", "manivela", "alternancia"],
    archetype: "Las tres criaturas en la rueda y la esfinge quieta en la cima.",
  },
  {
    rank: 11,
    roman: "XI",
    nameEs: "La Fuerza (La Force)",
    nameFr: "La Force",
    nameEn: "Strength",
    slug: "marseille-11-la-force",
    upright: "Inicio de la segunda decena de arcanos, contacto consciente con la energía animal.",
    reversed: "Tensión brutal, lucha desgastante de poder o debilidad asustada.",
    keywords: ["contacto", "energía animal", "firmeza", "grado XI"],
    archetype: "La mujer de sombrero infinito sosteniendo sin violencia las fauces del león.",
  },
  {
    rank: 12,
    roman: "XII",
    nameEs: "El Colgado (Le Pendu)",
    nameFr: "Le Pendu",
    nameEn: "The Hanged Man",
    slug: "marseille-12-le-pendu",
    upright: "Gestación meditativa, brazos atrás, detención que invierte las prioridades mundanas.",
    reversed: "Inercia culposa, victimización pasiva o estancamiento sin sentido.",
    keywords: ["inversión", "detención", "meditación", "espera"],
    archetype: "El ser colgado de un pie entre dos árboles podados con monedas en los bolsillos.",
  },
  {
    rank: 13,
    roman: "XIII",
    nameEs: "El Arcano Sin Nombre (L'Arcane sans nom)",
    nameFr: "L'Arcane sans nom",
    nameEn: "The Nameless Arcana (Death)",
    slug: "marseille-13-larcane-sans-nom",
    upright: "Transformación radical sin rótulo, siega de lo caduco, liberación del hueso esencial.",
    reversed: "Resistencia aterrada al cambio, agonía prolongada o duelo no resuelto.",
    keywords: ["siega", "transmutación", "esencia", "sin nombre"],
    archetype: "El esqueleto rojo sobre la tierra negra con guadaña de hoja dorada.",
  },
  {
    rank: 14,
    roman: "XIV",
    nameEs: "La Templanza (Tempérance)",
    nameFr: "Tempérance",
    nameEn: "Temperance",
    slug: "marseille-14-temperance",
    upright: "Circulación de fluidos sanadores, armonización continua entre cuerpo y espíritu.",
    reversed: "Disociación, falta de comunicación fluida o mezcla impura.",
    keywords: ["circulación", "ánforas", "alquimia", "sanación"],
    archetype: "El ángel de alas rojas y azules vertiendo agua entre dos vasijas sin tocar el suelo.",
  },
  {
    rank: 15,
    roman: "XV",
    nameEs: "El Diablo (Le Diable)",
    nameFr: "Le Diable",
    nameEn: "The Devil",
    slug: "marseille-15-le-diable",
    upright: "Fuerza telúrica, pulsión creativa abismal, magnetismo erótico y riquezas del fondo.",
    reversed: "Tiranía de las pasiones ciegas, engaño o servidumbre voluntaria.",
    keywords: ["telúrico", "magnetismo", "pulsión", "antorcha"],
    archetype: "La figura alada con antorcha sobre el pedestal al que están atados dos diablillos.",
  },
  {
    rank: 16,
    roman: "XVI",
    nameEs: "La Casa Dios (La Maison Dieu)",
    nameFr: "La Maison Dieu",
    nameEn: "The House of God (The Tower)",
    slug: "marseille-16-la-maison-dieu",
    upright: "Apertura forzosa del templo cerrado, festejo terrenal tras la descompresión, revelación.",
    reversed: "Colapso traumático, orgullo herido o encierro en murallas quebradas.",
    keywords: ["apertura", "descompresión", "templo", "relámpago"],
    archetype: "La torre descoronada por la llama y las dos figuras danzando con las manos en el suelo.",
  },
  {
    rank: 17,
    roman: "XVII",
    nameEs: "La Estrella (L'Étoile)",
    nameFr: "L'Étoile",
    nameEn: "The Star",
    slug: "marseille-17-letoile",
    upright: "Hallar el propio lugar en la tierra, purificación generosa sin reserva, armonía cósmica.",
    reversed: "Desolación, sentimiento de desarraigo o derroche estéril de dones.",
    keywords: ["propio lugar", "purificación", "vertido", "firmamento"],
    archetype: "La mujer arrodillada que nutre la tierra y el agua bajo las ocho estrellas.",
  },
  {
    rank: 18,
    roman: "XVIII",
    nameEs: "La Luna (La Lune)",
    nameFr: "La Lune",
    nameEn: "The Moon",
    slug: "marseille-18-la-lune",
    upright: "Poesía del inconsciente, magnetismo nocturno, aguas nutricias y receptividad matriarcal.",
    reversed: "Pesadilla ilusoria, depresión melancólica o pérdida en el laberinto.",
    keywords: ["poesía nocturna", "inconsciente", "mareas", "origen"],
    archetype: "Las gotas que ascienden hacia la luna mientras los cánidos custodian las torres.",
  },
  {
    rank: 19,
    roman: "XIX",
    nameEs: "El Sol (Le Soleil)",
    nameFr: "Le Soleil",
    nameEn: "The Sun",
    slug: "marseille-19-le-soleil",
    upright: "Fraternidad amorosa, luz fecunda compartida, lucidez fraterna y éxito claro.",
    reversed: "Desencuentro entre pares, ceguera por encandilamiento o aridez afectiva.",
    keywords: ["fraternidad", "calor", "claridad", "luz compartida"],
    archetype: "Los dos gemelos abrazados bajo la lluvia de dones dorados del gran sol.",
  },
  {
    rank: 20,
    roman: "XX",
    nameEs: "El Juicio (Le Jugement)",
    nameFr: "Le Jugement",
    nameEn: "Judgement",
    slug: "marseille-20-le-jugement",
    upright: "Resurrección consciente, llamado que une pasado, presente y futuro en una nueva vida.",
    reversed: "Sordera al llamado vocacional, resistencia a renacer o juicio moralizante.",
    keywords: ["resurrección", "trompeta", "nueva vida", "reunión"],
    archetype: "El ángel con la bandera de la cruz sonando la trompeta ante las tres figuras que emergen.",
  },
  {
    rank: 21,
    roman: "XXI",
    nameEs: "El Mundo (Le Monde)",
    nameFr: "Le Monde",
    nameEn: "The World",
    slug: "marseille-21-le-monde",
    upright: "Plenitud realizada, danza en el centro de la creación, totalidad viva y armónica.",
    reversed: "Imposibilidad de coronar la obra, encierro en la propia cáscara o aislamiento.",
    keywords: ["plenitud", "danza", "guirnalda", "realización"],
    archetype: "La doncella en la guirnalda rodeada por los cuatro evangelistas en las esquinas.",
  },
];

interface MarseilleSuitMeta {
  suit: TarotSuit;
  nameEs: string;
  nameFr: string;
  nameEn: string;
  slug: string;
  court: Array<{ rank: number; labelEs: string; labelFr: string; labelEn: string; slugPart: string }>;
}

const MARSEILLE_SUITS: MarseilleSuitMeta[] = [
  {
    suit: "wands",
    nameEs: "Bastos",
    nameFr: "Bâtons",
    nameEn: "Wands",
    slug: "bastos",
    court: [
      { rank: 11, labelEs: "Sota de Bastos", labelFr: "Valet de Bâtons", labelEn: "Page of Wands", slugPart: "11-valet" },
      { rank: 12, labelEs: "Caballero de Bastos", labelFr: "Cavalier de Bâtons", labelEn: "Knight of Wands", slugPart: "12-cavalier" },
      { rank: 13, labelEs: "Reina de Bastos", labelFr: "Reine de Bâtons", labelEn: "Queen of Wands", slugPart: "13-reine" },
      { rank: 14, labelEs: "Rey de Bastos", labelFr: "Roi de Bâtons", labelEn: "King of Wands", slugPart: "14-roi" },
    ],
  },
  {
    suit: "cups",
    nameEs: "Copas",
    nameFr: "Coupes",
    nameEn: "Cups",
    slug: "copas",
    court: [
      { rank: 11, labelEs: "Sota de Copas", labelFr: "Valet de Coupes", labelEn: "Page of Cups", slugPart: "11-valet" },
      { rank: 12, labelEs: "Caballero de Copas", labelFr: "Cavalier de Coupes", labelEn: "Knight of Cups", slugPart: "12-cavalier" },
      { rank: 13, labelEs: "Reina de Copas", labelFr: "Reine de Coupes", labelEn: "Queen of Cups", slugPart: "13-reine" },
      { rank: 14, labelEs: "Rey de Copas", labelFr: "Roi de Coupes", labelEn: "King of Cups", slugPart: "14-roi" },
    ],
  },
  {
    suit: "swords",
    nameEs: "Espadas",
    nameFr: "Épées",
    nameEn: "Swords",
    slug: "espadas",
    court: [
      { rank: 11, labelEs: "Sota de Espadas", labelFr: "Valet d'Épées", labelEn: "Page of Swords", slugPart: "11-valet" },
      { rank: 12, labelEs: "Caballero de Espadas", labelFr: "Cavalier d'Épées", labelEn: "Knight of Swords", slugPart: "12-cavalier" },
      { rank: 13, labelEs: "Reina de Espadas", labelFr: "Reine d'Épées", labelEn: "Queen of Swords", slugPart: "13-reine" },
      { rank: 14, labelEs: "Rey de Espadas", labelFr: "Roi d'Épées", labelEn: "King of Swords", slugPart: "14-roi" },
    ],
  },
  {
    suit: "pentacles",
    nameEs: "Oros",
    nameFr: "Deniers",
    nameEn: "Coins / Pentacles",
    slug: "oros",
    court: [
      { rank: 11, labelEs: "Sota de Oros", labelFr: "Valet de Deniers", labelEn: "Page of Pentacles", slugPart: "11-valet" },
      { rank: 12, labelEs: "Caballero de Oros", labelFr: "Cavalier de Deniers", labelEn: "Knight of Pentacles", slugPart: "12-cavalier" },
      { rank: 13, labelEs: "Reina de Oros", labelFr: "Reine de Deniers", labelEn: "Queen of Pentacles", slugPart: "13-reine" },
      { rank: 14, labelEs: "Rey de Oros", labelFr: "Roi de Deniers", labelEn: "King of Pentacles", slugPart: "14-roi" },
    ],
  },
];

const NUMERAL_RANKS = [
  { rank: 1, es: "As", fr: "As", en: "Ace" },
  { rank: 2, es: "Dos", fr: "Deux", en: "Two" },
  { rank: 3, es: "Tres", fr: "Trois", en: "Three" },
  { rank: 4, es: "Cuatro", fr: "Quatre", en: "Four" },
  { rank: 5, es: "Cinco", fr: "Cinq", en: "Five" },
  { rank: 6, es: "Seis", fr: "Six", en: "Six" },
  { rank: 7, es: "Siete", fr: "Sept", en: "Seven" },
  { rank: 8, es: "Ocho", fr: "Huit", en: "Eight" },
  { rank: 9, es: "Nueve", fr: "Neuf", en: "Nine" },
  { rank: 10, es: "Diez", fr: "Dix", en: "Ten" },
];

export const MARSEILLE_CARDS: CanonicalCard[] = [
  ...MARSEILLE_MAJOR_SEED.map(
    (m): CanonicalCard => ({
      id: `marseille-major-${String(m.rank).padStart(2, "0")}`,
      slug: m.slug,
      arcana: "major",
      suit: null,
      rankNumber: m.rank,
      romanNumeral: m.roman,
      canonicalName: m.nameEs,
      nameEn: m.nameEn,
      deckTradition: "marseille",
      searchKeywords: Array.from(
        new Set([
          m.nameEs,
          m.nameFr,
          m.nameEn,
          m.roman,
          String(m.rank),
          "Marsella",
          "Marseille",
          ...m.keywords,
        ])
      ),
      traditionalUpright: m.upright,
      traditionalReversed: m.reversed,
      traditionalKeywords: m.keywords,
      archetypeNote: `${m.archetype} (Tarot de Marsella histórico).`,
    })
  ),
  ...MARSEILLE_SUITS.flatMap((suitInfo) => {
    // 1 to 10
    const numbers: CanonicalCard[] = NUMERAL_RANKS.map((r) => {
      const canonicalName = `${r.es} de ${suitInfo.nameEs} (Marsella)`;
      const nameEn = `${r.en} of ${suitInfo.nameEn}`;
      const nameFr = `${r.fr} de ${suitInfo.nameFr}`;
      return {
        id: `marseille-${suitInfo.suit}-${String(r.rank).padStart(2, "0")}`,
        slug: `marseille-${suitInfo.slug}-${String(r.rank).padStart(2, "0")}`,
        arcana: "minor",
        suit: suitInfo.suit,
        rankNumber: r.rank,
        romanNumeral: String(r.rank),
        canonicalName,
        nameEn,
        deckTradition: "marseille",
        searchKeywords: [
          canonicalName,
          nameEn,
          nameFr,
          `${r.rank} de ${suitInfo.nameEs}`,
          `${r.rank} of ${suitInfo.nameEn}`,
          `${r.rank} de ${suitInfo.nameFr}`,
          `${r.en} of Coins`,
          "Marsella",
          "Marseille",
        ],
        traditionalUpright: `Estructura geométrica viva del palo de ${suitInfo.nameEs} en grado ${r.es}.`,
        traditionalReversed: `Tensión o exceso en la manifestación de ${suitInfo.nameEs} ${r.es}.`,
        traditionalKeywords: [suitInfo.nameEs.toLowerCase(), r.es.toLowerCase(), "geometría sagrada"],
        archetypeNote: `Patrón vegetal y simbólico clásico Conver/Camoin para ${r.es} de ${suitInfo.nameEs}.`,
      };
    });

    // 4 court cards
    const courts: CanonicalCard[] = suitInfo.court.map((c) => {
      const canonicalName = `${c.labelEs} (Marsella)`;
      return {
        id: `marseille-${suitInfo.suit}-${String(c.rank).padStart(2, "0")}`,
        slug: `marseille-${suitInfo.slug}-${c.slugPart}`,
        arcana: "minor",
        suit: suitInfo.suit,
        rankNumber: c.rank,
        romanNumeral: c.labelEs.slice(0, 2).toUpperCase(),
        canonicalName,
        nameEn: c.labelEn,
        deckTradition: "marseille",
        searchKeywords: [
          canonicalName,
          c.labelEs,
          c.labelFr,
          c.labelEn,
          `${c.labelEn.split(" ")[0]} of ${suitInfo.nameEn}`,
          "Marsella",
          "Marseille",
        ],
        traditionalUpright: `Presencia activa y digna del ${c.labelEs} en la tradición histórica.`,
        traditionalReversed: `Inestabilidad o desconexión en la figura del ${c.labelEs}.`,
        traditionalKeywords: [suitInfo.nameEs.toLowerCase(), "figura de corte", "marsella"],
        archetypeNote: `Figura cortesana de perfil según la xilografía clásica del Tarot de Marsella.`,
      };
    });

    return [...numbers, ...courts];
  }),
];
