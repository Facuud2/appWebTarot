import type { CanonicalCard } from "@/types/domain";

interface MajorSeed {
  rank: number;
  roman: string;
  slug: string;
  nameEs: string;
  nameEn: string;
  aliases: string[];
  upright: string;
  reversed: string;
  keywords: string[];
  archetype: string;
}

const MAJOR_ARCANA_SEED: MajorSeed[] = [
  {
    rank: 0,
    roman: "0",
    slug: "00-el-loco",
    nameEs: "El Loco",
    nameEn: "The Fool",
    aliases: ["The Fool", "Fool", "El Loco", "Loco", "0", "00"],
    upright: "Apertura radical, inicio sin garantías, disponibilidad ante la experiencia desconocida.",
    reversed: "Impulsividad desorientada, postergación del primer paso por vértigo o dispersión.",
    keywords: ["inicio", "disponibilidad", "umbral", "espontaneidad"],
    archetype: "El caminante en el borde antes de fijar rumbo.",
  },
  {
    rank: 1,
    roman: "I",
    slug: "01-el-mago",
    nameEs: "El Mago",
    nameEn: "The Magician",
    aliases: ["The Magician", "Magician", "El Mago", "Mago", "I", "1"],
    upright: "Disposición de recursos concretos sobre la mesa, iniciativa consciente, destreza técnica.",
    reversed: "Habilidad fragmentada, exceso de artificio o duda frente a las herramientas propias.",
    keywords: ["voluntad", "oficio", "instrumentos", "articulación"],
    archetype: "La mesa dispuesta con los cuatro elementos listos para obrar.",
  },
  {
    rank: 2,
    roman: "II",
    slug: "02-la-sacerdotisa",
    nameEs: "La Sacerdotisa",
    nameEn: "The High Priestess",
    aliases: ["The High Priestess", "High Priestess", "Priestess", "La Sacerdotisa", "Sacerdotisa", "Papisa", "II", "2"],
    upright: "Escucha silenciosa, gestación interna, estudio paciente y reserva necesaria.",
    reversed: "Silencio defensivo, desconexión de la intuición o lectura superficial del momento.",
    keywords: ["silencio", "reserva", "estudio", "gestación"],
    archetype: "El velo entre dos columnas y el libro reposando en el regazo.",
  },
  {
    rank: 3,
    roman: "III",
    slug: "03-la-emperatriz",
    nameEs: "La Emperatriz",
    nameEn: "The Empress",
    aliases: ["The Empress", "Empress", "La Emperatriz", "Emperatriz", "III", "3"],
    upright: "Fecundidad creativa, cultivo material, hospitalidad corporal y desarrollo orgánico.",
    reversed: "Agotamiento por sobreprotección, bloqueo expresivo o descuido del sustento propio.",
    keywords: ["cultivo", "abundancia", "cuerpo", "creación"],
    archetype: "La tierra cultivada que da forma sensible a lo concebido.",
  },
  {
    rank: 4,
    roman: "IV",
    slug: "04-el-emperador",
    nameEs: "El Emperador",
    nameEn: "The Emperor",
    aliases: ["The Emperor", "Emperor", "El Emperador", "Emperador", "IV", "4"],
    upright: "Estructura fiable, delimitación territorial clara, autoridad responsable y sostén pragmático.",
    reversed: "Rigidez defensiva, ejercicio autoritario del control o fragilidad institucional velada.",
    keywords: ["estructura", "límite", "gobierno", "firmeza"],
    archetype: "El trono de piedra que resguarda el orden fundado.",
  },
  {
    rank: 5,
    roman: "V",
    slug: "05-el-hierofante",
    nameEs: "El Hierofante",
    nameEn: "The Hierophant",
    aliases: ["The Hierophant", "Hierophant", "The Pope", "Pope", "El Hierofante", "El Papa", "Sumo Sacerdote", "V", "5"],
    upright: "Transmisión de una tradición compartida, puente ético, pertenencia comunitaria y enseñanza.",
    reversed: "Dogmatismo ciego, repetición vacía de fórmulas o ruptura necesaria con mandatos externos.",
    keywords: ["tradición", "puente", "doctrina", "aprendizaje"],
    archetype: "La llave cruzada y las dos figuras escuchando una palabra que organiza el sentido.",
  },
  {
    rank: 6,
    roman: "VI",
    slug: "06-los-enamorados",
    nameEs: "Los Enamorados",
    nameEn: "The Lovers",
    aliases: ["The Lovers", "Lovers", "Los Enamorados", "Enamorados", "Los Amantes", "Amantes", "VI", "6"],
    upright: "Elección orientada por afinidad profunda, alineación ética y compromiso voluntario.",
    reversed: "Vacilación entre opciones incompatibles, dependencia de validación externa o pactos débiles.",
    keywords: ["elección", "afinidad", "compromiso", "vínculo"],
    archetype: "La encrucijada donde el deseo íntimo debe nombrar su camino.",
  },
  {
    rank: 7,
    roman: "VII",
    slug: "07-el-carro",
    nameEs: "El Carro",
    nameEn: "The Chariot",
    aliases: ["The Chariot", "Chariot", "El Carro", "Carro", "VII", "7"],
    upright: "Avance coordinado, canalización de impulsos contrarios bajo un propósito firme.",
    reversed: "Pérdida de rumbo por velocidad desmedida, conflicto de mandos o tensión no resuelta.",
    keywords: ["dirección", "avance", "enfoque", "tracción"],
    archetype: "El vehículo conducido a través de fuerzas disímiles que aprenden a tirar juntas.",
  },
  {
    rank: 8,
    roman: "VIII",
    slug: "08-la-fuerza",
    nameEs: "La Fuerza",
    nameEn: "Strength",
    aliases: ["Strength", "La Fuerza", "Fuerza", "VIII", "8"],
    upright: "Templanza dulce, domesticación paciente del instinto sin violencia ni sometimiento.",
    reversed: "Lucha desgastante contra la propia naturaleza, represión o desborde reactivo.",
    keywords: ["mansedumbre", "paciencia", "instinto", "firmeza serena"],
    archetype: "Las manos que sostienen con suavidad las fauces del león.",
  },
  {
    rank: 9,
    roman: "IX",
    slug: "09-el-ermitano",
    nameEs: "El Ermitaño",
    nameEn: "The Hermit",
    aliases: ["The Hermit", "Hermit", "El Ermitaño", "Ermitaño", "El Ermitanyo", "IX", "9"],
    upright: "Retiro lúcido, búsqueda de claridad íntima, paso medido y luz propia en la penumbra.",
    reversed: "Aislamiento defensivo, encierro en la propia verdad o rechazo a orientar a quien pregunta.",
    keywords: ["lucidez", "retiro", "tiempo", "guía interior"],
    archetype: "La lámpara alzada en la noche solitaria y el bastón prudente.",
  },
  {
    rank: 10,
    roman: "X",
    slug: "10-la-rueda-de-la-fortuna",
    nameEs: "La Rueda de la Fortuna",
    nameEn: "Wheel of Fortune",
    aliases: ["Wheel of Fortune", "The Wheel", "La Rueda de la Fortuna", "Rueda de la Fortuna", "La Rueda", "X", "10"],
    upright: "Comprensión de los ciclos en movimiento, oportunidad que se abre en el giro del tiempo.",
    reversed: "Resistencia al cambio inevitable, sensación de azar adverso o aferramiento a lo caduco.",
    keywords: ["ciclo", "giro", "ritmo", "oportunidad"],
    archetype: "El eje inmóvil alrededor del cual ascienden y descienden las fases de la vida.",
  },
  {
    rank: 11,
    roman: "XI",
    slug: "11-la-justicia",
    nameEs: "La Justicia",
    nameEn: "Justice",
    aliases: ["Justice", "La Justicia", "Justicia", "XI", "11"],
    upright: "Equilibrio deliberado, evaluación honesta de causas y efectos, corte lúcido.",
    reversed: "Severidad implacable, negación de la propia responsabilidad o parcialidad en el juicio.",
    keywords: ["equilibrio", "claridad", "consecuencia", "rectitud"],
    archetype: "La balanza en reposo y la espada vertical de dos filos.",
  },
  {
    rank: 12,
    roman: "XII",
    slug: "12-el-colgado",
    nameEs: "El Colgado",
    nameEn: "The Hanged Man",
    aliases: ["The Hanged Man", "Hanged Man", "El Colgado", "Colgado", "XII", "12"],
    upright: "Suspensión voluntaria, cambio de punto de vista, renuncia lúcida a la acción inmediata.",
    reversed: "Sacrificio estéril, inmovilismo victimizado o resistencia a soltar un control ilusorio.",
    keywords: ["suspensión", "perspectiva", "pausa", "entrega"],
    archetype: "La mirada invertida que descubre otro orden mientras el cuerpo reposa atado.",
  },
  {
    rank: 13,
    roman: "XIII",
    slug: "13-la-muerte",
    nameEs: "La Muerte",
    nameEn: "Death",
    aliases: ["Death", "La Muerte", "Muerte", "El Arcano XIII", "XIII", "13"],
    upright: "Final necesario e irreversible, poda que despeja el suelo, desapego profundo.",
    reversed: "Aferramiento a formas agotadas, temor a la disolución o duelo postergado.",
    keywords: ["corte", "transformación", "despojo", "renovación"],
    archetype: "El segador implacable que devuelve la materia a la tierra para permitir otro brote.",
  },
  {
    rank: 14,
    roman: "XIV",
    slug: "14-la-templanza",
    nameEs: "La Templanza",
    nameEn: "Temperance",
    aliases: ["Temperance", "La Templanza", "Templanza", "XIV", "14"],
    upright: "Alquimia sutil, integración paciente de contrarios, dosificación sabia del caudal vital.",
    reversed: "Falta de medida, exceso o precipitación que desvirtúa la mezcla en proceso.",
    keywords: ["armonía", "medida", "fluidez", "integración"],
    archetype: "El trasvase constante de un ánfora a otra sin que se pierda una sola gota.",
  },
  {
    rank: 15,
    roman: "XV",
    slug: "15-el-diablo",
    nameEs: "El Diablo",
    nameEn: "The Devil",
    aliases: ["The Devil", "Devil", "El Diablo", "Diablo", "XV", "15"],
    upright: "Reconocimiento de las ataduras materiales, pulsión primaria, sombra y fascinación magnética.",
    reversed: "Liberación gradual de dependencias, lucidez ante la trampa o ilusión de servidumbre.",
    keywords: ["atadura", "pulsión", "sombra", "magnetismo"],
    archetype: "La cadena suelta al cuello que solo aprisiona mientras no se intente descolgar.",
  },
  {
    rank: 16,
    roman: "XVI",
    slug: "16-la-torre",
    nameEs: "La Torre",
    nameEn: "The Tower",
    aliases: ["The Tower", "Tower", "La Torre", "Torre", "XVI", "16"],
    upright: "Derrumbe súbito de lo edificado sobre fundamentos falsos, revelación intempestiva.",
    reversed: "Colapso demorado, temor al desarraigo o reconstrucción precipitada sobre escombros.",
    keywords: ["quiebre", "revelación", "liberación", "ruptura"],
    archetype: "El rayo que quiebra la corona de almenas y abre el cielo clausurado.",
  },
  {
    rank: 17,
    roman: "XVII",
    slug: "17-la-estrella",
    nameEs: "La Estrella",
    nameEn: "The Star",
    aliases: ["The Star", "Star", "La Estrella", "Estrella", "XVII", "17"],
    upright: "Esperanza serena, entrega sin cálculo de las aguas propias, generosidad transparente.",
    reversed: "Pérdida momentánea de fe, desconexión de la propia fuente o idealismo estéril.",
    keywords: ["esperanza", "claridad", "entrega", "sencillez"],
    archetype: "La mujer desnuda bajo el firmamento que vierte el agua en la tierra y en el río.",
  },
  {
    rank: 18,
    roman: "XVIII",
    slug: "18-la-luna",
    nameEs: "La Luna",
    nameEn: "The Moon",
    aliases: ["The Moon", "Moon", "La Luna", "Luna", "XVIII", "18"],
    upright: "Navegación del territorio incierto, memoria inconsciente, intuición y sombras proyectadas.",
    reversed: "Confusión disipada, salida paulatina de la niebla o exceso de susceptibilidad emotiva.",
    keywords: ["inconsciente", "sueño", "incertidumbre", "misterio"],
    archetype: "Los dos perros aullando bajo la luz pálida mientras el cangrejo emerge del fondo.",
  },
  {
    rank: 19,
    roman: "XIX",
    slug: "19-el-sol",
    nameEs: "El Sol",
    nameEn: "The Sun",
    aliases: ["The Sun", "Sun", "El Sol", "Sol", "XIX", "19"],
    upright: "Claridad meridiana, vitalidad compartida, franqueza y comprensión directa.",
    reversed: "Exposición agotadora, optimismo forzado o vitalidad momentáneamente velada.",
    keywords: ["claridad", "calidez", "franqueza", "presencia"],
    archetype: "Luz directa sin artificios en un jardín abierto.",
  },
  {
    rank: 20,
    roman: "XX",
    slug: "20-el-juicio",
    nameEs: "El Juicio",
    nameEn: "Judgement",
    aliases: ["Judgement", "Judgment", "El Juicio", "Juicio", "XX", "20"],
    upright: "Llamado inaplazable, recapitulación honesta de la historia vivida, despertar.",
    reversed: "Autojuicio paralizante, desoír una vocación clara o postergar una respuesta.",
    keywords: ["llamado", "despertar", "balance", "vocación"],
    archetype: "Responder con nombre propio cuando una etapa convoca a integrarse.",
  },
  {
    rank: 21,
    roman: "XXI",
    slug: "21-el-mundo",
    nameEs: "El Mundo",
    nameEn: "The World",
    aliases: ["The World", "World", "El Mundo", "Mundo", "XXI", "21"],
    upright: "Culminación íntegra de un ciclo, habitar el propio lugar, síntesis viva.",
    reversed: "Cierre incompleto, demora en el último gesto o dificultad para soltar la obra.",
    keywords: ["culminación", "totalidad", "síntesis", "presencia"],
    archetype: "La guirnalda cerrada que abraza los cuatro puntos cardinales.",
  },
];

interface MinorRankSeed {
  rank: number;
  labelEs: string;
  labelEn: string;
  slugPart: string;
}

const MINOR_RANKS: MinorRankSeed[] = [
  { rank: 1, labelEs: "As", labelEn: "Ace", slugPart: "01-as" },
  { rank: 2, labelEs: "Dos", labelEn: "Two", slugPart: "02-dos" },
  { rank: 3, labelEs: "Tres", labelEn: "Three", slugPart: "03-tres" },
  { rank: 4, labelEs: "Cuatro", labelEn: "Four", slugPart: "04-cuatro" },
  { rank: 5, labelEs: "Cinco", labelEn: "Five", slugPart: "05-cinco" },
  { rank: 6, labelEs: "Seis", labelEn: "Six", slugPart: "06-seis" },
  { rank: 7, labelEs: "Siete", labelEn: "Seven", slugPart: "07-siete" },
  { rank: 8, labelEs: "Ocho", labelEn: "Eight", slugPart: "08-ocho" },
  { rank: 9, labelEs: "Nueve", labelEn: "Nine", slugPart: "09-nueve" },
  { rank: 10, labelEs: "Diez", labelEn: "Ten", slugPart: "10-diez" },
  { rank: 11, labelEs: "Sota", labelEn: "Page", slugPart: "11-sota" },
  { rank: 12, labelEs: "Caballero", labelEn: "Knight", slugPart: "12-caballero" },
  { rank: 13, labelEs: "Reina", labelEn: "Queen", slugPart: "13-reina" },
  { rank: 14, labelEs: "Rey", labelEn: "King", slugPart: "14-rey" },
];

const SUIT_META: Record<
  "wands" | "cups" | "swords" | "pentacles",
  {
    nameEs: string;
    nameEn: string;
    slugSuit: string;
    domain: string;
    aliases: string[];
    uprightByRank: Record<number, { up: string; rev: string; kw: string[] }>;
  }
> = {
  wands: {
    nameEs: "Bastos",
    nameEn: "Wands",
    slugSuit: "bastos",
    domain: "Impulso creativo, deseo, acción y fuego vital",
    aliases: ["Wands", "Wand", "Rods", "Staves", "Bastos"],
    uprightByRank: {
      1: { up: "Chispa inicial de proyecto, vitalidad naciente y deseo de emprender.", rev: "Impulso contenido, vacilación al arrancar o energía dispersa.", kw: ["chispa", "impulso", "origen"] },
      2: { up: "Contemplación de horizonte, planificación antes de salir del terreno conocido.", rev: "Temor a ampliar el radio de acción o planes sin ejecución.", kw: ["horizonte", "proyección", "umbral"] },
      3: { up: "Expansión en marcha, primeras señales de retorno, mirada de largo alcance.", rev: "Demoras logísticas, impaciencia con los plazos o repliegue.", kw: ["expansión", "alcance", "travesía"] },
      4: { up: "Umbral compartido, celebración sobria de un hito estable, hospitalidad.", rev: "Transición doméstica inquieta o dificultad para festejar lo logrado.", kw: ["hito", "descanso", "hogar"] },
      5: { up: "Roce creativo, ensayo de fuerzas diversas, debate vivo sin jerarquía clara.", rev: "Fricción desgastante o evitación del desacuerdo necesario.", kw: ["fricción", "ensayo", "contraste"] },
      6: { up: "Reconocimiento público, avance respaldado, confianza ganada en la práctica.", rev: "Búsqueda ansiosa de aprobación o triunfo vivido en soledad.", kw: ["reconocimiento", "logro", "respaldo"] },
      7: { up: "Sostener la propia posición con firmeza ante demandas simultáneas.", rev: "Sensación de asedio, agotamiento defensivo o ceder terreno propio.", kw: ["defensa", "convicción", "firmeza"] },
      8: { up: "Aceleración repentina, noticias en tránsito, convergencia rápida de hechos.", rev: "Precipitación, contratiempos de comunicación o ritmo desincronizado.", kw: ["velocidad", "tránsito", "convergencia"] },
      9: { up: "Perseverancia curtida por la experiencia, reserva prudente cerca de la meta.", rev: "Vigilancia excesiva, fatiga acumulada o desconfianza crónica.", kw: ["resiliencia", "cautela", "umbral final"] },
      10: { up: "Sobrecarga asumida en solitario, exceso de responsabilidades sin delegar.", rev: "Soltar peso innecesario o colapso por sostener más de lo viable.", kw: ["carga", "delegación", "límite"] },
      11: { up: "Curiosidad entusiasta, exploración incipiente, mensaje que invita a probar.", rev: "Entusiasmo volátil, rumor inmaduro o falta de constancia inicial.", kw: ["exploración", "aprendiz", "curiosidad"] },
      12: { up: "Movimiento apasionado, acometida audaz, cambio rápido de escenario.", rev: "Prisa temeraria, interrupción abrupta o energía sin cauce.", kw: ["audacia", "movimiento", "ímpetu"] },
      13: { up: "Presencia magnética, calidez autónoma, creatividad sostenida con aplomo.", rev: "Autoexigencia silenciosa, irritabilidad por desgaste o retraimiento.", kw: ["calidez", "autonomía", "magnetismo"] },
      14: { up: "Visión directiva, liderazgo generoso que orienta proyectos de largo aliento.", rev: "Autoritarismo impaciente o visión desligada del cuidado cotidiano.", kw: ["visión", "dirección", "iniciativa"] },
    },
  },
  cups: {
    nameEs: "Copas",
    nameEn: "Cups",
    slugSuit: "copas",
    domain: "Afectividad, receptividad, vínculo, memoria e imaginación",
    aliases: ["Cups", "Cup", "Chalices", "Copas"],
    uprightByRank: {
      1: { up: "Receptividad afectiva plena, apertura cordial, renovación sensible.", rev: "Contención emocional por cautela o dificultad para recibir afecto.", kw: ["apertura", "afecto", "manantial"] },
      2: { up: "Reciprocidad genuina, trato horizontal, reconocimiento mutuo entre pares.", rev: "Desencuentro en los ritmos vinculares o asimetría no hablada.", kw: ["reciprocidad", "alianza", "encuentro"] },
      3: { up: "Celebración compartida, red de apoyo afín, alegría que se derrama.", rev: "Enredo grupal, superficialidad festiva o desgaste por sobreexposición social.", kw: ["comunidad", "brindis", "afecto compartido"] },
      4: { up: "Retraimiento necesario, pausa reflexiva frente a ofertas externas, digestión íntima.", rev: "Apatía defensiva, queja pasiva o ceguera ante lo ofrecido.", kw: ["pausa", "revisión", "reserva"] },
      5: { up: "Duelo por lo derramado, reconocimiento sincero de una pérdida sin cerrar el balance.", rev: "Fijación melancólica o urgencia por compensar sin tramitar el dolor.", kw: ["duelo", "pérdida", "remanente"] },
      6: { up: "Memoria nutricia, reconciliación con el origen, ternura y retorno a lo simple.", rev: "Nostalgia idealizada, anclaje infantil o comparación estéril con el pasado.", kw: ["memoria", "ternura", "origen"] },
      7: { up: "Proliferación de posibilidades, imaginación fecunda que requiere discernimiento.", rev: "Dispersión fantasiosa, parálisis por exceso de opciones o espejismo.", kw: ["imaginación", "discernimiento", "proyección"] },
      8: { up: "Partida silenciosa de lo que ya no alimenta, búsqueda de un sentido más hondo.", rev: "Abandono apresurado por frustración o demora en soltar lo caduco.", kw: ["partida", "búsqueda", "desprendimiento"] },
      9: { up: "Satisfacción íntima, bienestar cultivado, serenidad con los frutos propios.", rev: "Complacencia egoísta, aislamiento en el confort o falta de entrega.", kw: ["bienestar", "plenitud", "reposo"] },
      10: { up: "Armonía comunitaria sostenida, concordia vincular y descanso compartido.", rev: "Idealización familiar, fachada complaciente o tensiones subterráneas.", kw: ["concordia", "comunión", "paz"] },
      11: { up: "Sensibilidad poética, ofrecimiento sincero, delicadeza en el trato.", rev: "Hipersensibilidad evasiva, timidez paralizante o mensaje confuso.", kw: ["poesía", "delicadeza", "ofrenda"] },
      12: { up: "Propuesta afectiva con gracia, avance cortés, invitación a soñar con bases.", rev: "Idealismo seductor sin compromiso práctico o veleidad afectiva.", kw: ["cortejo", "gracia", "invitación"] },
      13: { up: "Escucha empática profunda, contención emocional lúcida, sabiduría intuitiva.", rev: "Inundación por el dolor ajeno, repliegue frío o dependencia afectiva.", kw: ["empatía", "escucha", "sabiduría intuitiva"] },
      14: { up: "Madurez afectiva, serenidad para sostener tormentas ajenas sin desbordar.", rev: "Manipulación emocional sutil o distanciamiento afectivo protector.", kw: ["templanza", "madurez emocional", "serenidad"] },
    },
  },
  swords: {
    nameEs: "Espadas",
    nameEn: "Swords",
    slugSuit: "espadas",
    domain: "Pensamiento, lenguaje, delimitación, verdad y discernimiento",
    aliases: ["Swords", "Sword", "Blades", "Espadas"],
    uprightByRank: {
      1: { up: "Claridad incisiva, comprensión repentina que corta la niebla mental.", rev: "Crueldad verbal, hiperracionalización o juicio precipitado.", kw: ["lucidez", "corte", "verdad"] },
      2: { up: "Tregua reflexiva, contención de bandos en pugna mientras madura un criterio.", rev: "Bloqueo por indecisión, negación de la evidencia o frialdad defensiva.", kw: ["tregua", "balance mental", "prudencia"] },
      3: { up: "Dolor reconocido con lucidez, desgarro necesario que disipa una ilusión.", rev: "Herida rumiada sin cierre, dramatismo o autoflagelación mental.", kw: ["desengaño", "lucidez dolorosa", "claridad"] },
      4: { up: "Reposo mental forzoso, convalecencia tras una batalla, silencio restaurador.", rev: "Agotamiento crónico por no frenar o letargo que prolonga la pausa.", kw: ["convalecencia", "silencio", "tregua interna"] },
      5: { up: "Victoria pírrica, reconocimiento del costo de imponer la propia razón a cualquier precio.", rev: "Rencor residual, humillación consentida o retirada con dignidad.", kw: ["conflicto", "costo de la victoria", "desgaste"] },
      6: { up: "Travesía hacia aguas más tranquilas, transición tras un período de conflicto.", rev: "Viaje con equipaje pesado, dificultad para soltar la contienda o recaída.", kw: ["travesía", "transición", "rumbo nuevo"] },
      7: { up: "Estrategia discreta, resolución solitaria que evita confrontación directa.", rev: "Evasión deshonesta, culpa por maniobras ocultas o plan descubierto.", kw: ["estrategia", "sigilo", "prudencia táctica"] },
      8: { up: "Sensación de aprisionamiento por creencias propias, límites autoimpuestos.", rev: "Primeros pasos para desatarse, reconocimiento de salidas disponibles.", kw: ["parálisis mental", "creencia limitante", "despertar"] },
      9: { up: "Desvelo por angustia mental, pensamientos rumiantes magnificados en la noche.", rev: "Apertura a la luz del día, relativización del temor o desahogo compartido.", kw: ["desvelo", "rumiación", "angustia"] },
      10: { up: "Término definitivo de un ciclo doloroso, fondo tocado que ya no admite empeorar.", rev: "Resistencia a declarar cerrado el proceso o victimismo prolongado.", kw: ["fondo", "cierre irreversible", "alivio"] },
      11: { up: "Agudeza crítica, vigilancia atenta, formulación precisa de preguntas difíciles.", rev: "Impertinencia mordaz, suspicacia o espionaje mezquino.", kw: ["agudeza", "pregunta lúcida", "vigilancia"] },
      12: { up: "Embocadura decidida hacia la verdad, velocidad mental que defiende una causa justa.", rev: "Fanatismo combativo, atropello de otros o disputa verbal innecesaria.", kw: ["ímpetu mental", "defensa lúcida", "corte tajante"] },
      13: { up: "Independencia de criterio, juicio sobrio forjado en la experiencia, honestidad directa.", rev: "Amargura defensiva, corte insensible o aislamiento escéptico.", kw: ["autonomía de juicio", "sobriedad", "claridad ética"] },
      14: { up: "Autoridad intelectual ética, capacidad para legislar con justicia y ecuanimidad.", rev: "Tiranía lógica, distanciamiento deshumanizado o frialdad burocrática.", kw: ["ecuanimidad", "justicia mental", "visión ética"] },
    },
  },
  pentacles: {
    nameEs: "Oros",
    nameEn: "Pentacles",
    slugSuit: "oros",
    domain: "Materia, cuerpo, recursos concretos, tiempo y trabajo sostenido",
    aliases: ["Pentacles", "Pentacle", "Coins", "Coin", "Disks", "Oros", "Monedas"],
    uprightByRank: {
      1: { up: "Semilla tangible, oportunidad material concreta que merece cultivo paciente.", rev: "Recurso desaprovechado, codicia prematura o falta de arraigo físico.", kw: ["semilla", "oportunidad concreta", "sustento"] },
      2: { up: "Malabarismo fluido con demandas cotidianas, flexibilidad ante cambios materiales.", rev: "Desborde operativo, descuido de prioridades o endeudamiento por dispersión.", kw: ["equilibrio móvil", "adaptación", "gestión"] },
      3: { up: "Oficio colaborativo, reconocimiento de la maestría técnica, obra bien cimentada.", rev: "Falta de coordinación en equipo, chapucería o conflicto de autorías.", kw: ["oficio", "colaboración", "calidad técnica"] },
      4: { up: "Conservación prudente de recursos, consolidación de una base firme.", rev: "Avaricia temerosa, rigidez posesiva o miedo paralizante a la escasez.", kw: ["arraigo", "reserva", "conservación"] },
      5: { up: "Intemperie material, paso por un período de escasez o aislamiento corporal.", rev: "Aceptación de ayuda disponible, cobijo recuperado o superación de la precariedad.", kw: ["intemperie", "fragilidad material", "umbral humilde"] },
      6: { up: "Circulación justa de recursos, generosidad consciente con reciprocidad digna.", rev: "Caridad condicionada, asimetría de poder o dependencia económica.", kw: ["reciprocidad", "reparto justo", "solvencia compartida"] },
      7: { up: "Evaluación paciente de la cosecha en curso, pausa antes de intervenir de más.", rev: "Impaciencia con los tiempos orgánicos, frustración con el rendimiento o abandono.", kw: ["paciencia", "evaluación orgánica", "tiempo de maduración"] },
      8: { up: "Dedicación minuciosa al oficio, perfeccionamiento paciente sin prisa externa.", rev: "Rutina alienante, perfeccionismo paralizante o descuido del fin de la labor.", kw: ["maestría", "detalle", "oficio diario"] },
      9: { up: "Soberanía material alcanzada con esfuerzo propio, disfrute sereno de la autonomía.", rev: "Aislamiento en la autosuficiencia, apariencia suntuosa sin paz o desconexión.", kw: ["autonomía", "fruto maduro", "soberanía"] },
      10: { up: "Legado duradero, red material intergeneracional, estabilidad arraigada.", rev: "Tensión patrimonial, peso de mandatos familiares o fragilidad institucional.", kw: ["legado", "continuidad", "raíces"] },
      11: { up: "Estudio aplicado, atención minuciosa a un oficio o proyecto incipiente.", rev: "Procrastinación práctica, falta de método o distracción del cuerpo.", kw: ["estudio", "método", "atención"] },
      12: { up: "Constancia metódica, fiabilidad paso a paso que cumple lo comprometido.", rev: "Inercia pesada, resistencia a innovar o estancamiento rutinario.", kw: ["constancia", "fiabilidad", "paso firme"] },
      13: { up: "Cuidado generoso de lo concreto, hospitalidad terrenal y sentido práctico.", rev: "Autoabandono corporal por sostener a otros o control doméstico.", kw: ["sustento", "presencia corporal", "hospitalidad"] },
      14: { up: "Administración serena y fecunda de recursos, solvencia puesta al servicio.", rev: "Materialismo estrecho, terquedad conservadora o temor al riesgo medido.", kw: ["solvencia", "administración", "firmeza"] },
    },
  },
};

export const RWS_CARDS: CanonicalCard[] = [
  ...MAJOR_ARCANA_SEED.map(
    (m): CanonicalCard => ({
      id: `major-${String(m.rank).padStart(2, "0")}`,
      slug: m.slug,
      arcana: "major",
      suit: null,
      rankNumber: m.rank,
      romanNumeral: m.roman,
      canonicalName: m.nameEs,
      nameEn: m.nameEn,
      deckTradition: "rws",
      searchKeywords: Array.from(
        new Set([
          m.nameEs,
          m.nameEn,
          ...m.aliases,
          m.roman,
          String(m.rank),
          ...m.keywords,
        ])
      ),
      traditionalUpright: m.upright.trim(),
      traditionalReversed: m.reversed.trim(),
      traditionalKeywords: m.keywords,
      archetypeNote: m.archetype,
    })
  ),
  ...((["wands", "cups", "swords", "pentacles"] as const).flatMap((suit) => {
    const suitInfo = SUIT_META[suit];
    return MINOR_RANKS.map((r): CanonicalCard => {
      const detail = suitInfo.uprightByRank[r.rank] ?? {
        up: suitInfo.domain,
        rev: suitInfo.domain,
        kw: [suitInfo.nameEs.toLowerCase()],
      };
      const canonicalName = `${r.labelEs} de ${suitInfo.nameEs}`;
      const nameEn = `${r.labelEn} of ${suitInfo.nameEn}`;

      const aliases = [
        canonicalName,
        nameEn,
        `${r.rank} de ${suitInfo.nameEs}`,
        `${r.rank} of ${suitInfo.nameEn}`,
        `${r.labelEn} of Coins`,
        `${r.rank} of Coins`,
        `${r.labelEs} ${suitInfo.nameEs}`,
        `${r.labelEn} ${suitInfo.nameEn}`,
      ];

      if (r.rank === 12) {
        aliases.push(`Caballo de ${suitInfo.nameEs}`);
      }

      return {
        id: `${suit}-${String(r.rank).padStart(2, "0")}`,
        slug: `${suitInfo.slugSuit}-${r.slugPart}`,
        arcana: "minor",
        suit,
        rankNumber: r.rank,
        romanNumeral:
          r.rank <= 10 ? String(r.rank) : r.labelEs.slice(0, 2).toUpperCase(),
        canonicalName,
        nameEn,
        deckTradition: "rws",
        searchKeywords: Array.from(
          new Set([
            ...aliases,
            ...suitInfo.aliases,
            String(r.rank),
            ...detail.kw,
          ])
        ),
        traditionalUpright: detail.up,
        traditionalReversed: detail.rev,
        traditionalKeywords: detail.kw,
        archetypeNote: `${suitInfo.domain} · Grado ${r.labelEs}.`,
      };
    });
  })),
];
