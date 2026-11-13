export const MUFFIN_FINISHES_KEY = 'recipe-book:muffin-finishes';
export const MUFFIN_TIER_COUNT = 10;

// Labels for the cover cupcake colourway switcher (kept apart from i18n.js).
export const themeText = {
  en: {
    changeColor: 'Change color',
    names: { cherry: 'Cherry', blueplate: 'Blue plate', soda: 'Soda', butterscotch: 'Butterscotch', afterhours: 'After hours' },
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
    names: { cherry: 'Kirsche', blueplate: 'Blauer Teller', soda: 'Soda', butterscotch: 'Karamell', afterhours: 'Nach Ladenschluss' },
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
  fr: {
    changeColor: 'Changer de couleur',
    names: { cherry: 'Cerise', blueplate: 'Assiette bleue', soda: 'Soda', butterscotch: 'Caramel au beurre', afterhours: 'Après la fermeture' },
    ringBell: 'Sonner la clochette de service',
    ding: 'Ding ! Commande prête.',
    ringing: 'Dring dring dring ! Patience, la tarte arrive.',
    bites: ['Miam. Une grosse bouchée.', 'Miam miam. Deux grosses bouchées.', 'Tout mangé !', 'Un cupcake tout frais !'],
    tiers: [
      // Tier 1 (finishes 1-4): cheeky diner base
      {
        allGone: [
          'Pas une miette. Suspect, tout ça.',
          'Hé, c’était le muffin d’expo !',
          'Avalé tout rond. Même pas mâché.',
          'Les calories de couverture comptent pas.',
          'Direct dans le gosier, hein ?',
        ],
        muffinReply: [
          'Je te manquais déjà ?',
          'De retour sur le plateau.',
          'Bien essayé, voleur de goûter.',
          'J’ai neuf vies, moi.',
          'Deuxième tournée, mon chou ?',
        ],
      },
      // Tier 2 (finishes 5-9): flirty warmup
      {
        allGone: [
          'Déjà de retour ? Tu as un faible.',
          'T’as léché la caissette, avoue.',
          'Quelqu’un aime bien le glaçage.',
          'La douceur ? Tu connais pas.',
          'Doucement là-dessus, bec sucré.',
        ],
        muffinReply: [
          'Croque-moi. Encore.',
          'Les yeux plus haut, merci.',
          'Mollo sur le glaçage.',
          'Oh, tu es bien impatient.',
          'Attention, je suis tout chaud.',
        ],
      },
      // Tier 3 (finishes 10-14): double entendres heating up
      {
        allGone: [
          'Deux chiffres. Zéro retenue.',
          'Droit par le sommet. Audacieux.',
          'Foncé direct sur la cerise.',
          'À fond dans le moule maintenant.',
          'Encore les mains baladeuses sur la pâte ?',
        ],
        muffinReply: [
          'Tout frais sorti du four !',
          'Pas touche à la cerise !',
          'Tu les aimes bien moelleux ?',
          'Revenu pour la crème ?',
          'Paye-moi un café d’abord.',
        ],
      },
      // Tier 4 (finishes 15-19): bold flirting & roasts
      {
        allGone: [
          'Tu te donnes à fond sur ces brioches.',
          'Pas de serviette. Complètement sauvage.',
          'Tout ça et toujours rien d’enfourné ?',
          'Mangé la crème avant le gâteau.',
          'On flirte ou on pâtisse là ?',
        ],
        muffinReply: [
          'J’adore comment tu me tiens.',
          'T’arrête surtout pas, chef.',
          'Trop chaud pour toi ?',
          'Mon glaçage, ton bazar.',
          'Il commence à faire chaud ici.',
        ],
      },
      // Tier 5 (finishes 20-24): spicy & judgy
      {
        allGone: [
          'Ton pouce mérite une cigarette.',
          'Jusqu’aux coudes dans la pâte, hein ?',
          'Même pas un dîner avant, sérieux ?',
          'Ce glaçage avait zéro chance.',
          'Tu dévores des pixels par sport maintenant ?',
        ],
        muffinReply: [
          'Plus fort. Non, plus doux.',
          'Encore tiède. Approche.',
          'Je suis fouetté. Littéralement.',
          'De la crème sur la lèvre.',
          'Tu te ressers ? Gourmand.',
        ],
      },
      // Tier 6 (finishes 25-29): unapologetically suggestive
      {
        allGone: [
          'Toujours zéro recette cuisinée.',
          'Tout ce boulot pour un pauvre PNG ?',
          'Avoue que tu craques pour mes miches.',
          'Mie fondante, zéro maîtrise.',
          'Mets donc ce pouce sur de la vraie pâte.',
        ],
        muffinReply: [
          'Dis que je suis ton préféré.',
          'Ooh, droit dans le cœur.',
          'Tu fais lever ma pâte.',
          'Petits doigts coquins.',
          'Gaffe, je coule.',
        ],
      },
      // Tier 7 (finishes 30-34): unhinged baker energy
      {
        allGone: [
          'Va manger de vrais glucides, pitié.',
          'En gros tu galoches un SVG.',
          'Les recettes sont DEDANS, génie.',
          'Croqué cru. Sans même préchauffer.',
          'Encore faim ?! Incroyable.',
        ],
        muffinReply: [
          'Prends les deux mains la prochaine fois.',
          'Glacé et tout retourné.',
          'Bas les yeux de ma caissette.',
          'Tu me ruines. Recommence.',
          'Serre-moi lentement encore.',
        ],
      },
      // Tier 8 (finishes 35-39): mild swearing + ferally flirty
      {
        allGone: [
          'Putain, tu détestes le bouton Ouvrir.',
          'Qui t’a affamé comme ça, merde.',
          'Glaçage pulvérisé, putain oui.',
          'Franchement ? Épouse le muffin.',
          'Zéro pitié. Terreur de la boulangerie.',
        ],
        muffinReply: [
          'Putain, tu lâches rien.',
          'Mange mes miettes, lâche.',
          'Bien trop chaud pour ça.',
          'Arrête de narguer, mords.',
          'Putain oui, continue.',
        ],
      },
      // Tier 9 (finishes 40-44): meltdown & peak innuendo
      {
        allGone: [
          'Va toucher de la vraie farine, merde !',
          'À ce stade, tu me dois un loyer.',
          'Tous les deux, brûlants et en vrac.',
          'T’as complètement pété les plombs.',
          'Pur désir pâtissier déchaîné.',
        ],
        muffinReply: [
          'Ma crème au beurre transpire.',
          'Traite-moi de vilaine brioche.',
          'On est fiancés maintenant ?!',
          'Merde, t’abandonnes jamais.',
          'Je suis plein. Encore.',
        ],
      },
      // Tier 10 (finishes 45-50+): wildest final boss chaos
      {
        allGone: [
          '45+ ?! T’as cassé la putain de boulangerie.',
          'Zéro gâteau cuit. Pur délire fébrile.',
          'Enragé sur un cupcake de dessin animé.',
          'Cinquante nuances de crème au beurre, pitié.',
          'Va cuire de vrais brownies, espèce de monstre !',
        ],
        muffinReply: [
          'Ton vice officiel désormais.',
          'OK. Prends toute ma crème.',
          'Bordel, encore ?!',
          'Passe-moi la bague au doigt.',
          'T’as gagné. À toi pour toujours.',
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

