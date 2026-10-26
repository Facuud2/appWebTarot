import { RWS_CARDS } from "./catalogs/rws";
import { MARSEILLE_CARDS } from "./catalogs/marseille";
import { THOTH_CARDS } from "./catalogs/thoth";
import { LENORMAND_CARDS } from "./catalogs/lenormand";
import { LIVING_WHEEL_CARDS } from "./catalogs/living-wheel";
import type {
  CanonicalCard,
  DeckTradition,
  SpreadPositionDefinition,
} from "@/types/domain";

export {
  RWS_CARDS,
  MARSEILLE_CARDS,
  THOTH_CARDS,
  LENORMAND_CARDS,
  LIVING_WHEEL_CARDS,
};

export const CANONICAL_TAROT_CARDS: CanonicalCard[] = [
  ...RWS_CARDS,
  ...MARSEILLE_CARDS,
  ...THOTH_CARDS,
  ...LENORMAND_CARDS,
  ...LIVING_WHEEL_CARDS,
];

export interface BuiltinDeckSeed {
  id: string;
  name: string;
  tradition: DeckTradition;
  author: string;
  cardCount: number;
  description: string;
  isDefault: boolean;
}

export const BUILTIN_DECKS: BuiltinDeckSeed[] = [
  {
    id: "deck-rws",
    name: "Rider-Waite-Smith (RWS)",
    tradition: "rws",
    author: "A.E. Waite & Pamela Colman Smith",
    cardCount: 78,
    description: "Mazo canónico tradicional de 78 cartas con ilustraciones pictóricas en arcanos mayores y menores.",
    isDefault: true,
  },
  {
    id: "deck-marseille",
    name: "Tarot de Marsella",
    tradition: "marseille",
    author: "Nicolás Conver / Tradición francesa histórica",
    cardCount: 78,
    description: "Estructura histórica clásica con La Justice (VIII), La Force (XI), L'Arcane sans nom (XIII) y palos de Bastos, Copas, Espadas y Oros.",
    isDefault: false,
  },
  {
    id: "deck-thoth",
    name: "Tarot de Thoth",
    tradition: "thoth",
    author: "Aleister Crowley & Lady Frieda Harris",
    cardCount: 78,
    description: "Mazo ceremonial esotérico. Incluye Ajuste (VIII), Deseo / Pasión (XI), El Eón (XX), El Universo (XXI), Discos y cortes con Caballero, Reina, Príncipe y Princesa.",
    isDefault: false,
  },
  {
    id: "deck-lenormand",
    name: "Tarot Lenormand",
    tradition: "lenormand",
    author: "Marie Anne Lenormand / Baraja Biedermeier",
    cardCount: 36,
    description: "Oráculo tradicional Petit Lenormand de 36 cartas con lectura directa (El Jinete, El Trébol, El Barco, La Casa, etc.).",
    isDefault: false,
  },
  {
    id: "deck-living-wheel",
    name: "The Living Wheel (Astrológico)",
    tradition: "living_wheel",
    author: "Sistema Astrológico Arquetípico",
    cardCount: 48,
    description: "Mazo astrológico integral que articula los 12 signos zodiacales, luminarias y planetas, las 12 casas natales, los 4 elementos y puntos kármicos.",
    isDefault: false,
  },
];

export interface BuiltinSpreadSeed {
  id: string;
  name: string;
  category: string;
  description: string;
  positions: SpreadPositionDefinition[];
}

export const BUILTIN_SPREAD_TEMPLATES: BuiltinSpreadSeed[] = [
  {
    id: "spread-triad-observation",
    name: "Pasado, Presente y Futuro (3 cartas)",
    category: "Clásica de 3 cartas",
    description:
      "Estructura lineal de tres posiciones para ver el origen del tema, la situación actual y hacia dónde se dirige.",
    positions: [
      {
        positionIndex: 1,
        title: "Pasado / Origen",
        prompt: "Antecedentes recientes o causa que trajo la situación hasta hoy.",
        coordX: 20,
        coordY: 50,
      },
      {
        positionIndex: 2,
        title: "Presente / Estado actual",
        prompt: "Lo que está ocurriendo ahora mismo y pide atención directa.",
        coordX: 50,
        coordY: 50,
      },
      {
        positionIndex: 3,
        title: "Futuro / Tendencia",
        prompt: "Dirección probable o próximo paso si se mantiene el rumbo actual.",
        coordX: 80,
        coordY: 50,
      },
    ],
  },
  {
    id: "spread-simple-cross",
    name: "Cruz de cinco cartas",
    category: "Clásica de 5 cartas",
    description:
      "Estructura en cruz con síntesis central para contrastar lo que ayuda, lo que frena, la meta buscada y la base del tema.",
    positions: [
      {
        positionIndex: 1,
        title: "A favor",
        prompt: "Recurso disponible, apoyo o punto fuerte que acompaña.",
        coordX: 22,
        coordY: 50,
      },
      {
        positionIndex: 2,
        title: "En contra / Obstáculo",
        prompt: "Dificultad principal, bloqueo o aspecto que genera resistencia.",
        coordX: 78,
        coordY: 50,
      },
      {
        positionIndex: 3,
        title: "Meta / Lo que se busca",
        prompt: "Objetivo consciente, expectativa o lo que se desea lograr.",
        coordX: 50,
        coordY: 18,
      },
      {
        positionIndex: 4,
        title: "Base / Origen",
        prompt: "Raíz del asunto, motivación de fondo o condición previa.",
        coordX: 50,
        coordY: 82,
      },
      {
        positionIndex: 5,
        title: "Centro / Síntesis",
        prompt: "Resumen central y consejo integrador de las cuatro posiciones.",
        coordX: 50,
        coordY: 50,
      },
    ],
  },
  {
    id: "spread-horseshoe-7",
    name: "Herradura de siete cartas",
    category: "Clásica de 7 cartas",
    description:
      "Recorrido en arco de siete posiciones para analizar la evolución de un problema, factores externos, consejos y desenlace.",
    positions: [
      {
        positionIndex: 1,
        title: "Pasado",
        prompt: "Situación previa que influye directamente en la consulta.",
        coordX: 14,
        coordY: 75,
      },
      {
        positionIndex: 2,
        title: "Presente",
        prompt: "Punto exacto en el que se encuentra hoy el consultante.",
        coordX: 24,
        coordY: 45,
      },
      {
        positionIndex: 3,
        title: "Influencias ocultas",
        prompt: "Factores que aún no se ven con claridad o se pasan por alto.",
        coordX: 36,
        coordY: 22,
      },
      {
        positionIndex: 4,
        title: "Obstáculo principal",
        prompt: "Desafío concreto que es necesario atravesar o resolver.",
        coordX: 50,
        coordY: 15,
      },
      {
        positionIndex: 5,
        title: "Entorno y otras personas",
        prompt: "Actitud del entorno, vínculos o circunstancias externas.",
        coordX: 64,
        coordY: 22,
      },
      {
        positionIndex: 6,
        title: "Acción recomendada",
        prompt: "Mejor postura o decisión práctica a tomar frente al tema.",
        coordX: 76,
        coordY: 45,
      },
      {
        positionIndex: 7,
        title: "Resultado / Desenlace",
        prompt: "Resolución probable integrando las posiciones anteriores.",
        coordX: 86,
        coordY: 75,
      },
    ],
  },
  {
    id: "spread-celtic-cross",
    name: "Cruz Celta (10 cartas)",
    category: "Clásica de 10 cartas",
    description:
      "Estructura tradicional completa de diez cartas que combina la cruz de la situación actual con la columna de evolución.",
    positions: [
      {
        positionIndex: 1,
        title: "Situación central",
        prompt: "Tema principal que vive hoy el consultante.",
        coordX: 30,
        coordY: 50,
      },
      {
        positionIndex: 2,
        title: "Lo que cruza",
        prompt: "Factor que se interpone, desafía o impulsa el tema central.",
        coordX: 38,
        coordY: 54,
      },
      {
        positionIndex: 3,
        title: "Base / Raíz",
        prompt: "Causa de fondo o experiencia pasada que sostiene el asunto.",
        coordX: 30,
        coordY: 82,
      },
      {
        positionIndex: 4,
        title: "Pasado reciente",
        prompt: "Etapa o acontecimiento que está quedando atrás.",
        coordX: 12,
        coordY: 50,
      },
      {
        positionIndex: 5,
        title: "Meta consciente",
        prompt: "Lo que el consultante espera, piensa o busca lograr.",
        coordX: 30,
        coordY: 18,
      },
      {
        positionIndex: 6,
        title: "Futuro próximo",
        prompt: "Lo que se acerca en el corto plazo.",
        coordX: 52,
        coordY: 50,
      },
      {
        positionIndex: 7,
        title: "Actitud propia",
        prompt: "Cómo se para y se siente el consultante ante la situación.",
        coordX: 82,
        coordY: 84,
      },
      {
        positionIndex: 8,
        title: "Entorno externo",
        prompt: "Influencia familiar, laboral o de las personas involucradas.",
        coordX: 82,
        coordY: 62,
      },
      {
        positionIndex: 9,
        title: "Deseos y miedos",
        prompt: "Expectativas internas o dudas frente al cambio.",
        coordX: 82,
        coordY: 40,
      },
      {
        positionIndex: 10,
        title: "Resultado final",
        prompt: "Síntesis general y cierre hacia donde tiende el proceso.",
        coordX: 82,
        coordY: 18,
      },
    ],
  },
];
