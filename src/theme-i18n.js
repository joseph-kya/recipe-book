export const MUFFIN_FINISHES_KEY = 'recipe-book:muffin-finishes';
export const MUFFIN_TIER_COUNT = 10;

// Labels for the cover cupcake colourway switcher (kept apart from i18n.js).
export const themeText = {
  en: {
    changeColor: 'Change color',
    names: { cherry: 'Cherry', blueplate: 'Blue plate', soda: 'Soda', butterscotch: 'Butterscotch' },
    ringBell: 'Ring the service bell',
    ding: 'Ding! Order up.',
    ringing: 'Ring ring ring! Patience, the pie is coming.',
    bites: ['Nom. One big bite.', 'Nom nom. Two big bites.', 'All gone!', 'A fresh cupcake!'],
    tiers: [
      // Tier 1 (finishes 1-4): cheeky diner base
      {
        allGone: [
          'Zero crumbs. Suspiciously clean.',
          'Hey, that was the display muffin!',
          'Inhaled. Didn’t even chew.',
          'Cover calories don’t count.',
          'Straight down the hatch, huh?',
        ],
        muffinReply: [
          'Missed me already?',
          'Back on the tray.',
          'Nice try, snack thief.',
          'I have nine lives.',
          'Round two, cupcake?',
        ],
      },
      // Tier 2 (finishes 5-9): flirty warmup
      {
        allGone: [
          'Back already? You’ve got a type.',
          'You licked the wrapper, didn’t you?',
          'Somebody likes ’em frosted.',
          'Gentle? Never heard of her.',
          'Slow down there, sweet tooth.',
        ],
        muffinReply: [
          'Bite me. Again.',
          'Eyes up here, please.',
          'Easy with the frosting.',
          'Oh, you’re eager.',
          'Careful, I’m warm.',
        ],
      },
      // Tier 3 (finishes 10-14): double entendres heating up
      {
        allGone: [
          'Double digits. Zero chill.',
          'Right off the top. Bold move.',
          'Went straight for the cherry.',
          'Deep in the muffin tray now.',
          'Handsy with the pastry again?',
        ],
        muffinReply: [
          'Fresh out the oven!',
          'Hands off the cherry!',
          'You like ’em soft?',
          'Back for the cream?',
          'Buy me coffee first.',
        ],
      },
      // Tier 4 (finishes 15-19): bold flirting & roasts
      {
        allGone: [
          'You’re really working those buns.',
          'No napkin. Purely feral.',
          'All this and still no baking?',
          'Ate the cream before the cake.',
          'Are we flirting or baking?',
        ],
        muffinReply: [
          'Love how you hold me.',
          'Don’t stop now, baker.',
          'Too hot to handle?',
          'My frosting, your mess.',
          'Getting steamy in here.',
        ],
      },
      // Tier 5 (finishes 20-24): spicy & judgy
      {
        allGone: [
          'Your thumb needs a cigarette.',
          'Elbow-deep in batter, huh?',
          'Not even dinner first, wow.',
          'That glaze stood zero chance.',
          'Devouring pixels for sport now?',
        ],
        muffinReply: [
          'Harder. Wait—gentler.',
          'Still warm. Come close.',
          'I’m whipped. Literally.',
          'Cream on your lip.',
          'Seconds? So greedy.',
        ],
      },
      // Tier 6 (finishes 25-29): unapologetically suggestive
      {
        allGone: [
          'Still zero actual recipes cooked.',
          'All that mouthwork for a PNG?',
          'Just admit you love my buns.',
          'Moist crumb, zero self-control.',
          'Put that thumb to real dough.',
        ],
        muffinReply: [
          'Say I’m your favorite.',
          'Ooh, right in the core.',
          'Making my batter rise.',
          'Naughty little fingers.',
          'Careful, I drip.',
        ],
      },
      // Tier 7 (finishes 30-34): unhinged baker energy
      {
        allGone: [
          'Go eat real carbs, please.',
          'Basically making out with SVG.',
          'The recipes are INSIDE, genius.',
          'Bitten raw. No preheating at all.',
          'Still hungry?! Unbelievable.',
        ],
        muffinReply: [
          'Use both hands next time.',
          'Glazed and confused.',
          'Eyes off my wrapper.',
          'Ruining me. Do it again.',
          'Hold me slow again.',
        ],
      },
      // Tier 8 (finishes 35-39): mild swearing + ferally flirty
      {
        allGone: [
          'Damn, you hate the Open button.',
          'Who hurt your sweet tooth, damn.',
          'Frosting got wrecked, hell yeah.',
          'Honestly? Just marry the muffin.',
          'Zero chill. Total bakery menace.',
        ],
        muffinReply: [
          'Damn, you’re relentless.',
          'Eat my crumbs, coward.',
          'Way too hot for this.',
          'Stop teasing, bite down.',
          'Hell yes, keep going.',
        ],
      },
      // Tier 9 (finishes 40-44): meltdown & peak innuendo
      {
        allGone: [
          'Go touch some flour, damn it.',
          'At this point, you owe me rent.',
          'Both of us, piping hot messes.',
          'You’ve lost the damn plot.',
          'Pure, unhinged pastry lust.',
        ],
        muffinReply: [
          'My buttercream’s sweating.',
          'Call me a bad bun.',
          'Are we engaged now?!',
          'Damn, you never quit.',
          'I’m stuffed. More.',
        ],
      },
      // Tier 10 (finishes 45-50+): wildest final boss chaos
      {
        allGone: [
          '45+?! You broke the damn bakery.',
          'Zero recipes baked. Pure fever dream.',
          'Feral over a fictional frosted bun.',
          'Fifty shades of buttercream, Jesus.',
          'Go bake real brownies, you menace.',
        ],
        muffinReply: [
          'Your unhealthy habit now.',
          'Fine. Take all my cream.',
          'Holy hell, again?!',
          'Put a ring on it.',
          'You win. Yours forever.',
        ],
      },
    ],
  },
  de: {
    changeColor: 'Farbe wechseln',
    names: { cherry: 'Kirsche', blueplate: 'Blauer Teller', soda: 'Soda', butterscotch: 'Karamell' },
    ringBell: 'Tischglocke läuten',
    ding: 'Ding! Bestellung fertig.',
    ringing: 'Kling kling kling! Geduld, der Kuchen kommt.',
    bites: ['Mmm. Ein großer Bissen.', 'Mmm mmm. Zwei große Bissen.', 'Alles weg!', 'Ein frischer Cupcake!'],
    tiers: [
      // Tier 1 (finishes 1-4): cheeky diner base
      {
        allGone: [
          'Kein Krümel übrig. Verdächtig.',
          'Hey, das war das Dekostück!',
          'Eingeatmet, nicht gekaut.',
          'Cover-Kalorien zählen nicht.',
          'Zack, einfach weggesnackt.',
        ],
        muffinReply: [
          'Schon vermisst?',
          'Wieder aufm Blech.',
          'Netter Versuch, Dieb.',
          'Ich hab neun Leben.',
          'Noch ’ne Runde?',
        ],
      },
      // Tier 2 (finishes 5-9): flirty warmup
      {
        allGone: [
          'Schon wieder? Du hast ’n Schema.',
          'Hast du grad das Papier abgeleckt?',
          'Da steht wer auf Glasur.',
          'Zärtlich? Kennste nicht.',
          'Immer langsam, Naschkatze.',
        ],
        muffinReply: [
          'Beiß mich. Nochmal.',
          'Augen nach oben!',
          'Vorsicht mit dem Guss.',
          'Oha, ganz schön gierig.',
          'Achtung, bin noch warm.',
        ],
      },
      // Tier 3 (finishes 10-14): double entendres heating up
      {
        allGone: [
          'Zweistellig. Null Zurückhaltung.',
          'Direkt oben abgebissen. Mutig.',
          'Sofort auf die Kirsche gestürzt.',
          'Ganz schön tief im Blech jetzt.',
          'Schon wieder so grabbelig?',
        ],
        muffinReply: [
          'Frisch ausm Ofen!',
          'Finger weg von der Kirsche!',
          'Magst es schön weich?',
          'Wieder Bock auf Sahne?',
          'Erst mal ’n Kaffee!',
        ],
      },
      // Tier 4 (finishes 15-19): bold flirting & roasts
      {
        allGone: [
          'Ganz schön fix an den Backen.',
          'Ohne Serviette. Komplett wild.',
          'So oft – und noch nix gebacken?!',
          'Erst die Creme, dann der Teig.',
          'Flirten wir oder backen wir?',
        ],
        muffinReply: [
          'Mag’s, wie du mich hältst.',
          'Hör bloß nicht auf.',
          'Zu heiß für dich?',
          'Mein Guss, dein Chaos.',
          'Wird ganz dampfig hier.',
        ],
      },
      // Tier 5 (finishes 20-24): spicy & judgy
      {
        allGone: [
          'Dein Daumen braucht ’ne Kippe.',
          'Bis zum Ellbogen im Teig, na klar.',
          'Nicht mal erst zum Essen einladen?',
          'Die Glasur hatte null Chance.',
          'Pixel futtern als Leistungssport?',
        ],
        muffinReply: [
          'Fester. Nee – sanfter.',
          'Noch warm. Komm näher.',
          'Fix und aufgeschlagen.',
          'Creme am Mundwinkel.',
          'Nachschlag? Gierschlund.',
        ],
      },
      // Tier 6 (finishes 25-29): unapologetically suggestive
      {
        allGone: [
          'Immer noch null Rezepte gekocht.',
          'So viel Einsatz für ’n Pixel-Teil?',
          'Sag doch, du willst meine Brötchen.',
          'Saftiger Teig, null Beherrschung.',
          'Knet lieber echten Teig, Mensch.',
        ],
        muffinReply: [
          'Sag, ich bin der Beste.',
          'Ooh, mitten ins Herz.',
          'Mein Teig geht auf.',
          'Ganz schön frech heute.',
          'Vorsicht, ich tropfe.',
        ],
      },
      // Tier 7 (finishes 30-34): unhinged baker energy
      {
        allGone: [
          'Hol dir sofort echte Carbs.',
          'Du knutscht grad ’ne Vektorgrafik.',
          'Die Rezepte sind IM Buch, Genie.',
          'Roh angebissen. Ohne Vorheizen.',
          'Immer noch hungrig?! Unglaublich.',
        ],
        muffinReply: [
          'Nimm beide Hände!',
          'Glasiert und verwirrt.',
          'Weg vom Förmchen!',
          'Machst mich fertig. Mehr.',
          'Drück nochmal langsam.',
        ],
      },
      // Tier 8 (finishes 35-39): mild swearing + ferally flirty
      {
        allGone: [
          'Verdammt, du hasst den Öffnen-Knopf.',
          'Wer hat dich so ausgehungert?',
          'Glasur komplett zerlegt, alter Schwede.',
          'Ganz ehrlich? Heirate mich doch.',
          'Null Gnade. Bäckerei-Schreck.',
        ],
        muffinReply: [
          'Verdammt hartnäckig.',
          'Friss Krümel, Feigling.',
          'Viel zu heiß dafür.',
          'Nicht necken, beißen!',
          'Oh ja, gib alles.',
        ],
      },
      // Tier 9 (finishes 40-44): meltdown & peak innuendo
      {
        allGone: [
          'Fass mal echtes Mehl an, verdammt!',
          'Ab jetzt schuldest du mir Miete.',
          'Beide komplett durchgedreht hier.',
          'Du hast den verdammten Verstand weg.',
          'Reine, hemmungslose Backwaren-Gier.',
        ],
        muffinReply: [
          'Buttercreme schwitzt.',
          'Nenn mich freches Teil.',
          'Sind wir jetzt verlobt?!',
          'Verdammt, du gibst nie auf.',
          'Bin voll. Weiter!',
        ],
      },
      // Tier 10 (finishes 45-50+): wildest final boss chaos
      {
        allGone: [
          '45+?! Backstube komplett zerlegt.',
          'Null gebacken. Nur noch Fiebertraum.',
          'Komplett wild auf ’n Comic-Küchlein.',
          'Fifty Shades of Buttercreme, Hilfe.',
          'Back endlich echte Brownies, Monster!',
        ],
        muffinReply: [
          'Deine Sucht für immer.',
          'Na gut. Nimm alle Sahne.',
          'Verdammt, schon wieder?!',
          'Jetzt steck ’n Ring drauf.',
          'Du gewinnst. Für immer dein.',
        ],
      },
    ],
  },
};

let memoryFinishes = 0;

function defaultStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function tierForFinishes(finishes) {
  const n = Number.isFinite(finishes) ? Math.max(0, Math.floor(finishes)) : 0;
  return Math.min(MUFFIN_TIER_COUNT - 1, Math.floor(n / 5));
}

export function getMuffinFinishes(storage = defaultStorage()) {
  if (storage) {
    try {
      const raw = storage.getItem(MUFFIN_FINISHES_KEY);
      if (raw !== null && /^\d+$/.test(raw.trim())) {
        const parsed = Number(raw.trim());
        if (Number.isSafeInteger(parsed) && parsed >= 0) return parsed;
      }
      return 0;
    } catch {
      return memoryFinishes;
    }
  }
  return memoryFinishes;
}

export function recordMuffinFinish(storage = defaultStorage()) {
  const next = getMuffinFinishes(storage) + 1;
  memoryFinishes = next;
  if (storage) {
    try {
      storage.setItem(MUFFIN_FINISHES_KEY, String(next));
    } catch {
      /* storage blocked: keep count for this visit */
    }
  }
  return next;
}

export function pickNextIndex(length, lastIndex = -1, random = Math.random) {
  if (length <= 1) return 0;
  const hasPrevious = Number.isInteger(lastIndex) && lastIndex >= 0 && lastIndex < length;
  if (!hasPrevious) {
    return Math.min(length - 1, Math.floor(random() * length));
  }
  const pick = Math.min(length - 2, Math.floor(random() * (length - 1)));
  return pick >= lastIndex ? pick + 1 : pick;
}

