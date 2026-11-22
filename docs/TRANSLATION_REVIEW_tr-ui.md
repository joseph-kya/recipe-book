# Translation Review Log — `tr-ui`

Scope: All German and French UI chrome (`src/i18n.js`, `src/recipe-reading-i18n.js`, `src/contents-find.js`, `src/theme-i18n.js`) plus the French (`fr`) blocks of all six recipe JSON files in `content/recipes/`.

Total fixes: **156** (71 German UI/muffin fixes, 34 French UI/muffin fixes, 51 French recipe fixes).

---

## `src/i18n.js` (19 fixes: 10 DE, 9 FR)

### German (`de`)
1. `pdfLabel` — **Old:** `` `Druckblatt für ${title} herunterladen ...` `` | **New:** `` `Druckversion für ${title} herunterladen ...` `` | **Why:** „Druckblatt“ sounds awkward/machine-translated; „Druckversion“ is idiomatic German.
2. `shareDescription` — **Old:** `'Josephs Backrezepte, mit Tassen und Löffeln zuerst.'` | **New:** `'Josephs Backrezepte – Tassen und Löffel zuerst.'` | **Why:** Cleaner, more natural phrasing parallel to `description`.
3. `unitMetricLong` — **Old:** `'metrisch zuerst'` | **New:** `'Gramm zuerst'` | **Why:** Warmer, more natural baking-book phrasing (matches French `grammes d’abord`).
4. `switchToMetric` — **Old:** `'Tassen — Einheiten: zu Gramm (g) wechseln'` | **New:** `'Tassen — Einheiten: auf Gramm (g) umstellen'` | **Why:** Idiomatic German verb for switching measurement units („auf … umstellen“).
5. `switchToCups` — **Old:** `'g — Einheiten: Gramm, zu Tassen wechseln'` | **New:** `'g — Einheiten: Gramm, auf Tassen umstellen'` | **Why:** Consistent idiomatic verb for switching units.
6. `bookLabel` — **Old:** `'Rezeptbuch. Wischen oder Pfeiltasten zum Blättern.'` | **New:** `'Rezeptbuch. Zum Blättern wischen oder die Pfeiltasten verwenden.'` | **Why:** Full, natural sentence instead of clipped phrasing.
7. `timerClear` — **Old:** `'Pausierten Timer löschen'` | **New:** `'Pausierten Timer zurücksetzen'` | **Why:** Timers are reset („zurücksetzen“), not deleted („löschen“), in natural German.
8. `timerReset` — **Old:** `'Zeit ist um. Timer löschen'` | **New:** `'Zeit ist um. Timer zurücksetzen'` | **Why:** Consistent idiomatic kitchen-timer wording.
9. `clearTicksLabel` — **Old:** `'Zurücksetzen: alle abgehakten Zutaten'` | **New:** `'Alle abgehakten Zutaten zurücksetzen'` | **Why:** Natural German word order instead of colon-prefixed machine phrasing.
10. `cookTimerJump` — **Old:** `` `Timer für Schritt ${step}: ${status}. Zu Schritt ${step}` `` | **New:** `` `Timer für Schritt ${step}: ${status}. Zu Schritt ${step} springen` `` | **Why:** Matches English “Jump to step” with a complete action verb for screen readers.

### French (`fr`)
11. `macros` — **Old:** `'Macros'` | **New:** `'Nutrition'` | **Why:** Replaces English fitness slang with natural French cookbook terminology.
12. `englishOnly` — **Old:** `'Pour l’instant uniquement en anglais.'` | **New:** `'Uniquement en anglais pour l’instant.'` | **Why:** Smoother, more natural French word order.
13. `timerPause` — **Old:** `` `Reste ${left}. Mettre le minuteur en pause` `` | **New:** `` `Il reste ${left}. Mettre le minuteur en pause` `` | **Why:** Complete, natural French clause for screen readers.
14. `timerResume` — **Old:** `` `En pause, reste ${left}. Reprendre le minuteur` `` | **New:** `` `En pause, il reste ${left}. Reprendre le minuteur` `` | **Why:** Complete, natural French clause matching `timerPause`.
15. `timerClear` — **Old:** `'Effacer le minuteur en pause'` | **New:** `'Annuler le minuteur en pause'` | **Why:** You cancel („annuler“), not erase („effacer“), a paused timer in French.
16. `timerReset` — **Old:** `'Temps écoulé. Effacer le minuteur'` | **New:** `'Temps écoulé. Réinitialiser le minuteur'` | **Why:** Idiomatic French for resetting a finished timer.
17. `keepAwake` — **Old:** `'Garder l’écran allumé pendant la pâtisserie'` | **New:** `'Garder l’écran allumé pendant la préparation'` | **Why:** „pendant la pâtisserie“ is unidiomatic in French; „pendant la préparation“ is natural.
18. `clearTicksLabel` — **Old:** `'Effacer tous les ingrédients cochés'` | **New:** `'Décocher tous les ingrédients'` | **Why:** „Effacer“ sounds like deleting ingredients; „Décocher“ accurately describes unticking.
19. `cookTimerJump` — **Old:** `` `Minuteur étape ${step} : ${status}. Aller à l’étape ${step}` `` | **New:** `` `Minuteur de l’étape ${step} : ${status}. Aller à l’étape ${step}` `` | **Why:** Proper French preposition („de l’étape“) instead of telegraphic noun stacking.

---

## `src/recipe-reading-i18n.js` (1 fix: FR)

20. `fr.ingredientsProgress` — **Old:** `` `${got} sur ${total} ingrédients prêts` `` | **New:** `` `${got} ingrédient${got > 1 ? 's' : ''} sur ${total} prêt${got > 1 ? 's' : ''}` `` | **Why:** Fixes ungrammatical French word order („X sur Y ingrédients“) and adds proper singular/plural agreement (0 and 1 singular in French).

---

## `src/contents-find.js` (4 fixes: 2 DE, 2 FR)

21. `de.findLabel` — **Old:** `'Rezept nach Name, Zutat oder Zeit suchen'` | **New:** `'Rezept nach Namen, Zutat oder Zeit suchen'` | **Why:** Correct weak-masculine dative case (`nach Namen`).
22. `de.clearFind` — **Old:** `'Suche löschen'` | **New:** `'Suche leeren'` | **Why:** Natural German UI wording for clearing a search input.
23. `fr.recipeCount` — **Old:** `` n === 1 ? '1 recette' : `${n} recettes` `` | **New:** `` n <= 1 ? `${n} recette` : `${n} recettes` `` | **Why:** In French, 0 takes singular (`0 recette`).
24. `fr.matchCount` — **Old:** `` n === 1 ? `1 sur ${total} recettes` : `${n} sur ${total} recettes` `` | **New:** `` n <= 1 ? `${n} recette sur ${total}` : `${n} recettes sur ${total}` `` | **Why:** Fixes ungrammatical French word order (`X recette(s) sur Y`) and 0/1 singular agreement.

---

## `src/theme-i18n.js` (81 fixes: 59 DE, 22 FR)

### German (`de`) — removed Northern/Berlin German slang (`aufm`, `ausm`, `’ne`, `’n`, `Kennste`, `Nee`, `Kippe`, `alter Schwede`, `Brötchen`, `Bock auf Sahne`), removed anglicisms (`Cover`, `weggesnackt`, `Carbs`, `Fifty Shades of`), unified cupcake terms (`Glasur`, `Creme`, `Förmchen`), and sharpened punchlines
25. `ringing` — **Old:** `'Kling kling kling! Geduld, der Kuchen kommt.'` | **New:** `'Ding, ding, ding! Geduld, der Kuchen kommt gleich.'` | **Why:** Matches the service bell (`Ding!`) and reads more naturally.
26. `bites[1]` — **Old:** `'Mmm mmm. Zwei große Bissen.'` | **New:** `'Mmm, mmm. Zwei große Bissen.'` | **Why:** Natural punctuation for repeated interjection.
27. Tier 1 `allGone[0]` — **Old:** `'Kein Krümel übrig. Verdächtig.'` | **New:** `'Kein Krümel übrig. Verdächtig sauber.'` | **Why:** Captures “Suspiciously clean” completely.
28. Tier 1 `allGone[2]` — **Old:** `'Eingeatmet, nicht gekaut.'` | **New:** `'Eingeatmet. Nicht mal gekaut.'` | **Why:** Lands the comedic beat of “Didn’t even chew.”
29. Tier 1 `allGone[3]` — **Old:** `'Cover-Kalorien zählen nicht.'` | **New:** `'Titelbild-Kalorien zählen nicht.'` | **Why:** Removes English leftover „Cover“.
30. Tier 1 `allGone[4]` — **Old:** `'Zack, einfach weggesnackt.'` | **New:** `'Zack, einfach weggeputzt.'` | **Why:** Removes anglicism „weggesnackt“ in favor of natural German „weggeputzt“.
31. Tier 1 `muffinReply[1]` — **Old:** `'Wieder aufm Blech.'` | **New:** `'Zurück auf dem Blech.'` | **Why:** Replaces clumsy „aufm“ with clean colloquial German.
32. Tier 1 `muffinReply[2]` — **Old:** `'Netter Versuch, Dieb.'` | **New:** `'Netter Versuch, Naschdieb.'` | **Why:** Keeps the “snack thief” joke.
33. Tier 1 `muffinReply[4]` — **Old:** `'Noch ’ne Runde?'` | **New:** `'Runde zwei, Schätzchen?'` | **Why:** Removes Northern „’ne“ and keeps the cheeky “cupcake?” pet name.
34. Tier 2 `allGone[0]` — **Old:** `'Schon wieder? Du hast ’n Schema.'` | **New:** `'Schon wieder? Du hast wohl ein Beuteschema.'` | **Why:** Removes „’n“ and uses the natural German dating idiom „Beuteschema“ for “a type”.
35. Tier 2 `allGone[1]` — **Old:** `'Hast du grad das Papier abgeleckt?'` | **New:** `'Hast du grad das Förmchen abgeleckt?'` | **Why:** Uses the proper baking term „Förmchen“ for cupcake wrapper.
36. Tier 2 `allGone[3]` — **Old:** `'Zärtlich? Kennste nicht.'` | **New:** `'Zärtlich? Kennst du wohl nicht.'` | **Why:** Removes Berlin slang „Kennste“.
37. Tier 2 `muffinReply[0]` — **Old:** `'Beiß mich. Nochmal.'` | **New:** `'Beiß mich. Noch mal.'` | **Why:** Correct Duden spelling (`noch mal`).
38. Tier 2 `muffinReply[1]` — **Old:** `'Augen nach oben!'` | **New:** `'Augen nach oben, bitte.'` | **Why:** Preserves the cheeky polite tone of “please”.
39. Tier 2 `muffinReply[2]` — **Old:** `'Vorsicht mit dem Guss.'` | **New:** `'Sachte mit der Glasur.'` | **Why:** Consistent cupcake term „Glasur“ and warmer phrasing.
40. Tier 2 `muffinReply[3]` — **Old:** `'Oha, ganz schön gierig.'` | **New:** `'Oha, ganz schön stürmisch.'` | **Why:** Matches flirty “eager” better and avoids repeating „gierig“ (Tier 5 „Gierschlund“).
41. Tier 3 `allGone[3]` — **Old:** `'Ganz schön tief im Blech jetzt.'` | **New:** `'Jetzt steckst du tief im Blech.'` | **Why:** More natural German syntax.
42. Tier 3 `allGone[4]` — **Old:** `'Schon wieder so grabbelig?'` | **New:** `'Wieder auf Tuchfühlung mit Gebäck?'` | **Why:** Replaces Northern slang „grabbelig“ with a sharp, universally natural pun.
43. Tier 3 `muffinReply[0]` — **Old:** `'Frisch ausm Ofen!'` | **New:** `'Frisch aus dem Ofen!'` | **Why:** Replaces clumsy „ausm“.
44. Tier 3 `muffinReply[3]` — **Old:** `'Wieder Bock auf Sahne?'` | **New:** `'Wieder Lust auf die Creme?'` | **Why:** Replaces Northern „Bock auf Sahne“ with Austrian/German-friendly „Lust auf die Creme“.
45. Tier 3 `muffinReply[4]` — **Old:** `'Erst mal ’n Kaffee!'` | **New:** `'Erst mal einen Kaffee ausgeben!'` | **Why:** Removes „’n“ and lands “Buy me coffee first.”
46. Tier 4 `allGone[0]` — **Old:** `'Ganz schön fix an den Backen.'` | **New:** `'Ganz schön fleißig an den Backen.'` | **Why:** Replaces Northern „fix“ with natural „fleißig“ while keeping the „Backen“ pun.
47. Tier 4 `muffinReply[0]` — **Old:** `'Mag’s, wie du mich hältst.'` | **New:** `'Ich mag, wie du mich hältst.'` | **Why:** Smoother, more natural rhythm.
48. Tier 4 `muffinReply[1]` — **Old:** `'Hör bloß nicht auf.'` | **New:** `'Hör bloß nicht auf, Bäcker.'` | **Why:** Preserves “baker”.
49. Tier 4 `muffinReply[3]` — **Old:** `'Mein Guss, dein Chaos.'` | **New:** `'Meine Glasur, dein Chaos.'` | **Why:** Consistent cupcake term „Glasur“.
50. Tier 4 `muffinReply[4]` — **Old:** `'Wird ganz dampfig hier.'` | **New:** `'Es wird ganz schön heiß hier.'` | **Why:** „dampfig“ is a literal calque of “steamy”; „heiß“ lands the flirtation naturally.
51. Tier 5 `allGone[0]` — **Old:** `'Dein Daumen braucht ’ne Kippe.'` | **New:** `'Dein Daumen braucht jetzt eine Zigarette.'` | **Why:** Replaces Northern slang „’ne Kippe“.
52. Tier 5 `allGone[2]` — **Old:** `'Nicht mal erst zum Essen einladen?'` | **New:** `'Kein Abendessen vorher? Oha.'` | **Why:** Punchier and captures the dry “wow”.
53. Tier 5 `muffinReply[0]` — **Old:** `'Fester. Nee – sanfter.'` | **New:** `'Fester. Warte – sanfter.'` | **Why:** Replaces Northern „Nee“ and keeps “Wait—”.
54. Tier 6 `allGone[0]` — **Old:** `'Immer noch null Rezepte gekocht.'` | **New:** `'Immer noch kein Rezept gebacken.'` | **Why:** Baking book context („gebacken“) and smoother phrasing.
55. Tier 6 `allGone[1]` — **Old:** `'So viel Einsatz für ’n Pixel-Teil?'` | **New:** `'So viel Einsatz für ein paar Pixel?'` | **Why:** Removes „’n“ and awkward „Pixel-Teil“.
56. Tier 6 `allGone[2]` — **Old:** `'Sag doch, du willst meine Brötchen.'` | **New:** `'Gib’s zu, du liebst meine süßen Backen.'` | **Why:** Replaces Germany-German „Brötchen“ with a natural baking double entendre.
57. Tier 6 `allGone[4]` — **Old:** `'Knet lieber echten Teig, Mensch.'` | **New:** `'Knet lieber mal echten Teig.'` | **Why:** Cleaner, less regional colloquial tone.
58. Tier 6 `muffinReply[0]` — **Old:** `'Sag, ich bin der Beste.'` | **New:** `'Sag, ich bin dein Liebling.'` | **Why:** Matches “favorite” („Liebling“) rather than “the best”.
59. Tier 6 `muffinReply[2]` — **Old:** `'Mein Teig geht auf.'` | **New:** `'Du lässt meinen Teig aufgehen.'` | **Why:** Keeps the flirty agency of “Making my batter rise.”
60. Tier 6 `muffinReply[3]` — **Old:** `'Ganz schön frech heute.'` | **New:** `'Ganz schön freche Finger.'` | **Why:** Preserves “Naughty little fingers.”
61. Tier 7 `allGone[0]` — **Old:** `'Hol dir sofort echte Carbs.'` | **New:** `'Iss bitte echte Kohlenhydrate.'` | **Why:** Removes anglicism „Carbs“.
62. Tier 7 `allGone[1]` — **Old:** `'Du knutscht grad ’ne Vektorgrafik.'` | **New:** `'Du knutscht grad eine Vektorgrafik.'` | **Why:** Removes Northern „’ne“.
63. Tier 7 `muffinReply[0]` — **Old:** `'Nimm beide Hände!'` | **New:** `'Nächstes Mal beide Hände!'` | **Why:** Keeps “next time”.
64. Tier 7 `muffinReply[2]` — **Old:** `'Weg vom Förmchen!'` | **New:** `'Augen weg vom Förmchen!'` | **Why:** Keeps “Eyes off my wrapper.”
65. Tier 7 `muffinReply[3]` — **Old:** `'Machst mich fertig. Mehr.'` | **New:** `'Du machst mich fertig. Noch mal.'` | **Why:** Closer to “Do it again” and more natural.
66. Tier 7 `muffinReply[4]` — **Old:** `'Drück nochmal langsam.'` | **New:** `'Halt mich noch mal ganz lang.'` | **Why:** Fixes `noch mal` spelling and plays on pressing & holding the muffin.
67. Tier 8 `allGone[1]` — **Old:** `'Wer hat dich so ausgehungert?'` | **New:** `'Wer hat dich bloß so ausgehungert?'` | **Why:** Adds natural emphasis matching the tier’s heightened tone.
68. Tier 8 `allGone[2]` — **Old:** `'Glasur komplett zerlegt, alter Schwede.'` | **New:** `'Glasur komplett zerlegt, oh ja!'` | **Why:** Replaces Germany-German „alter Schwede“ and matches “hell yeah”.
69. Tier 8 `allGone[3]` — **Old:** `'Ganz ehrlich? Heirate mich doch.'` | **New:** `'Ganz ehrlich? Heirate den Muffin doch.'` | **Why:** `allGone` is the narrator’s voice (“marry the muffin”), not the muffin’s.
70. Tier 8 `muffinReply[1]` — **Old:** `'Friss Krümel, Feigling.'` | **New:** `'Friss meine Krümel, Feigling.'` | **Why:** Preserves “my crumbs”.
71. Tier 8 `muffinReply[3]` — **Old:** `'Nicht necken, beißen!'` | **New:** `'Nicht necken, beiß zu!'` | **Why:** Natural imperative matching “bite down”.
72. Tier 8 `muffinReply[4]` — **Old:** `'Oh ja, gib alles.'` | **New:** `'Oh ja, mach weiter.'` | **Why:** Accurately matches “keep going”.
73. Tier 9 `allGone[2]` — **Old:** `'Beide komplett durchgedreht hier.'` | **New:** `'Beide komplett heiß und hinüber.'` | **Why:** Preserves the “piping hot messes” double meaning.
74. Tier 9 `allGone[3]` — **Old:** `'Du hast den verdammten Verstand weg.'` | **New:** `'Du hast komplett den Verstand verloren.'` | **Why:** Fixes unidiomatic „den Verstand weg haben“.
75. Tier 9 `allGone[4]` — **Old:** `'Reine, hemmungslose Backwaren-Gier.'` | **New:** `'Pure, hemmungslose Gebäck-Lust.'` | **Why:** „Backwaren“ sounds clinical/supermarket-like; „Gebäck-Lust“ lands “pastry lust”.
76. Tier 9 `muffinReply[0]` — **Old:** `'Buttercreme schwitzt.'` | **New:** `'Meine Buttercreme schwitzt.'` | **Why:** Keeps the possessive “My buttercream’s sweating.”
77. Tier 9 `muffinReply[1]` — **Old:** `'Nenn mich freches Teil.'` | **New:** `'Nenn mich freches Küchlein.'` | **Why:** Keeps the pastry pun (“bad bun”).
78. Tier 9 `muffinReply[4]` — **Old:** `'Bin voll. Weiter!'` | **New:** `'Ich platze. Mehr!'` | **Why:** Lands “I’m stuffed. More.” more vividly.
79. Tier 10 `allGone[0]` — **Old:** `'45+?! Backstube komplett zerlegt.'` | **New:** `'45+?! Du hast die ganze Backstube gesprengt.'` | **Why:** Avoids repeating „komplett zerlegt“ from Tier 8 and punches harder.
80. Tier 10 `allGone[2]` — **Old:** `'Komplett wild auf ’n Comic-Küchlein.'` | **New:** `'Völlig verrückt nach einem Comic-Küchlein.'` | **Why:** Removes „’n“ and avoids repeating „komplett wild“.
81. Tier 10 `allGone[3]` — **Old:** `'Fifty Shades of Buttercreme, Hilfe.'` | **New:** `'Fünfzig Schattierungen Buttercreme, Herrje.'` | **Why:** Removes English phrase while keeping the exact joke.
82. Tier 10 `muffinReply[1]` — **Old:** `'Na gut. Nimm alle Sahne.'` | **New:** `'Na gut. Nimm die ganze Creme.'` | **Why:** Fixes ungrammatical „alle Sahne“ and keeps „Creme“ consistent.
83. Tier 10 `muffinReply[3]` — **Old:** `'Jetzt steck ’n Ring drauf.'` | **New:** `'Steck mir schon einen Ring an.'` | **Why:** Removes „’n“ and uses the correct German verb (`einen Ring anstecken`).

### French (`fr`) — fixed literal calques (`putain oui`, `Bas les yeux`, `Tu me ruines`, `délire fébrile`, `Enragé sur`, `Je suis plein`) and sharpened comedic punch
84. `ringing` — **Old:** `'Dring dring dring ! Patience, la tarte arrive.'` | **New:** `'Dring, dring, dring ! Patience, la tarte arrive.'` | **Why:** Cleaner French punctuation.
85. Tier 2 `allGone[0]` — **Old:** `'Déjà de retour ? Tu as un faible.'` | **New:** `'Déjà de retour ? T’as un genre bien précis.'` | **Why:** Lands “You’ve got a type.” natively.
86. Tier 2 `allGone[4]` — **Old:** `'Doucement là-dessus, bec sucré.'` | **New:** `'Tout doux, bec sucré.'` | **Why:** Idiomatic French instead of literal “Slow down there”.
87. Tier 3 `allGone[1]` — **Old:** `'Droit par le sommet. Audacieux.'` | **New:** `'Direct par le sommet. Osé.'` | **Why:** Snappier and flirtier in spoken French.
88. Tier 5 `allGone[3]` — **Old:** `'Ce glaçage avait zéro chance.'` | **New:** `'Ce glaçage n’avait aucune chance.'` | **Why:** Natural French idiom instead of anglicized „avait zéro chance“.
89. Tier 5 `allGone[4]` — **Old:** `'Tu dévores des pixels par sport maintenant ?'` | **New:** `'Dévorer des pixels, ton nouveau sport ?'` | **Why:** Replaces literal „par sport“ with punchy spoken French.
90. Tier 5 `muffinReply[0]` — **Old:** `'Plus fort. Non, plus doux.'` | **New:** `'Plus fort. Attends — plus doux.'` | **Why:** Keeps the exact comedic beat of “Wait—”.
91. Tier 6 `allGone[0]` — **Old:** `'Toujours zéro recette cuisinée.'` | **New:** `'Toujours zéro recette préparée.'` | **Why:** „préparée“ fits baking recipes better than „cuisinée“.
92. Tier 7 `muffinReply[0]` — **Old:** `'Prends les deux mains la prochaine fois.'` | **New:** `'À deux mains la prochaine fois.'` | **Why:** More compact (fits narrow screens) and more idiomatic.
93. Tier 7 `muffinReply[2]` — **Old:** `'Bas les yeux de ma caissette.'` | **New:** `'Lâche ma caissette des yeux !'` | **Why:** „Bas les yeux“ is not a French idiom; „Lâche … des yeux“ is.
94. Tier 7 `muffinReply[3]` — **Old:** `'Tu me ruines. Recommence.'` | **New:** `'Tu m’achèves. Recommence.'` | **Why:** „Tu me ruines“ sounds financial; „Tu m’achèves“ lands the flirty tone naturally.
95. Tier 7 `muffinReply[4]` — **Old:** `'Serre-moi lentement encore.'` | **New:** `'Serre-moi encore tout doucement.'` | **Why:** Natural French adverb placement.
96. Tier 8 `allGone[1]` — **Old:** `'Qui t’a affamé comme ça, merde.'` | **New:** `'Qui t’a affamé comme ça, bordel ?'` | **Why:** Question mark for a question and stronger comedic rhythm.
97. Tier 8 `allGone[2]` — **Old:** `'Glaçage pulvérisé, putain oui.'` | **New:** `'Glaçage pulvérisé, oh que oui !'` | **Why:** Replaces English calque „putain oui“ with authentic French „oh que oui !“.
98. Tier 8 `muffinReply[3]` — **Old:** `'Arrête de narguer, mords.'` | **New:** `'Arrête de me narguer, croque !'` | **Why:** „croque“ fits a muffin and flirting far better than „mords“.
99. Tier 8 `muffinReply[4]` — **Old:** `'Putain oui, continue.'` | **New:** `'Bordel, continue !'` | **Why:** Removes literal calque „Putain oui“.
100. Tier 9 `muffinReply[4]` — **Old:** `'Je suis plein. Encore.'` | **New:** `'Je déborde. Encore.'` | **Why:** „Je suis plein“ is awkward/means drunk in French; „Je déborde“ fits a stuffed muffin.
101. Tier 10 `allGone[0]` — **Old:** `'45+ ?! T’as cassé la putain de boulangerie.'` | **New:** `'45+ ?! T’as explosé toute la boulangerie.'` | **Why:** Replaces literal calque „cassé la putain de…“ with natural French.
102. Tier 10 `allGone[1]` — **Old:** `'Zéro gâteau cuit. Pur délire fébrile.'` | **New:** `'Zéro gâteau cuit. Pur rêve fiévreux.'` | **Why:** „délire fébrile“ sounds clinical; „rêve fiévreux“ matches “fever dream”.
103. Tier 10 `allGone[2]` — **Old:** `'Enragé sur un cupcake de dessin animé.'` | **New:** `'Déchaîné pour un cupcake de dessin animé.'` | **Why:** Fixes ungrammatical preposition „enragé sur“.
104. Tier 10 `allGone[4]` — **Old:** `'Va cuire de vrais brownies, espèce de monstre !'` | **New:** `'Va faire de vrais brownies, espèce de monstre !'` | **Why:** In French you „faire des brownies“ rather than „cuire des brownies“ for baking from scratch.
105. Tier 10 `muffinReply[1]` — **Old:** `'OK. Prends toute ma crème.'` | **New:** `'Bon. Prends toute ma crème.'` | **Why:** More natural French equivalent of “Fine.”

---

## French Recipe Blocks in `content/recipes/` (51 fixes)

### `content/recipes/berry-quark-bake.json` (10 fixes)
106. `fr.title_lines` — **Old:** `["Gratin Citron", "& Fruits Rouges"]` | **New:** `["Gratin citron", "& fruits rouges"]` | **Why:** French sentence-case typography consistent with all other recipes.
107. `fr.intro` — **Old:** `"...gratin sucré au quark de REWE... blancs en neige..."` | **New:** `"...gratin sucré de REWE... blanc en neige..."` | **Why:** Removes inconsistent German/English „quark“ and matches the single egg (`blanc en neige`).
108. `fr.groups[0].items[0].name` — **Old:** `"fruits rouges mélangés"` | **New:** `"mélange de fruits rouges"` | **Why:** More idiomatic French ingredient phrasing.
109. `fr.steps[0].text` — **Old:** `"...Râpez le zeste du citron."` | **New:** `"...Zestez le citron."` | **Why:** Avoids pleonasm („râper le zeste“); authentic French baking verb.
110. `fr.steps[0].cue` — **Old:** `"...pas baignés dans le jus."` | **New:** `"...sans baigner dans leur jus."` | **Why:** Fixes awkward passive phrasing with natural French.
111. `fr.steps[1].text` — **Old:** `"Séparez l’œuf. ..."` | **New:** `"Séparez le blanc du jaune. ..."` | **Why:** Replaces literal English calque („Separate the egg“) with standard French pastry phrasing.
112. `fr.steps[1].cue` — **Old:** `"Becs fermes."` | **New:** `"Neige bien ferme."` | **Why:** „Becs fermes“ in plural is unidiomatic in French pastry.
113. `fr.steps[2].text` — **Old:** `"...et l’autre cuillère à soupe de sucre."` | **New:** `"...et la seconde c. à soupe de sucre."` | **Why:** Cleaner phrasing and consistent unit abbreviation (`c. à soupe`).
114. `fr.steps[3].text` — **Old:** `"...incorporez les fruits rouges délicatement."` | **New:** `"...incorporez délicatement les fruits rouges."` | **Why:** Natural French adverb placement.
115. `fr.steps[3].cue` — **Old:** `"Les fruits sont répartis, pas écrasés."` | **New:** `"Les fruits sont bien répartis, sans être écrasés."` | **Why:** Smoother, more idiomatic French.

### `content/recipes/best-classic-cinnamon-rolls.json` (13 fixes)
116. `fr.tagline` — **Old:** `"Deux scientifiques en alimentation. ..."` | **New:** `"Deux experts en sciences alimentaires. ..."` | **Why:** More natural French phrasing for “food scientists”.
117. `fr.groups[0].items[3].note` — **Old:** `"gros sel : pesez 10 g (environ 2 c. à café)"` | **New:** `"sel kasher : pesez 10 g (environ 2 c. à café)"` | **Why:** Accurate translation of kosher salt (French *gros sel* has different density).
118. `fr.groups[0].items[5].name` — **Old:** `"huile neutre"` | **New:** `"huile liquide"` | **Why:** Matches English “liquid oil” and avoids contradicting olive oil in the note.
119. `fr.groups[0].items[5].note` — **Old:** `"tournesol, colza, végétale ou olive"` | **New:** `"végétale, colza, tournesol ou olive"` | **Why:** Matches English order cleanly.
120. `fr.steps[0].title` — **Old:** `"Les secs en petits tas."` | **New:** `"Les poudres en petits tas."` | **Why:** Standard French pastry term (`les poudres`) instead of clipped „Les secs“.
121. `fr.steps[1].title` — **Old:** `"Pétrissez sérieusement."` | **New:** `"Pétrissez pour de bon."` | **Why:** Warmer, more natural phrasing for “Knead it like you mean it.”
122. `fr.steps[1].text` — **Old:** `"...vitesse moyenne-basse... Trop sec ou ferme ?..."` | **New:** `"...vitesse lente à moyenne... Pâte trop sèche ou ferme ?..."` | **Why:** Idiomatic mixer speed phrasing and feminine agreement with `pâte`.
123. `fr.steps[3].text` — **Old:** `"...(sautez le froid si la cuisine est fraîche)."` | **New:** `"...(passez cette étape si la cuisine est très fraîche)."` | **Why:** Removes awkward „sautez le froid“ and accurately translates “very cold kitchen”.
124. `fr.steps[3].cue` — **Old:** `"Presque triplé de volume."` | **New:** `"Volume presque triplé."` | **Why:** Grammatically sound without masculine/feminine mismatch with `pâte`.
125. `fr.steps[4].cue` — **Old:** `"Une pâte de sable mouillé : ni chaude (le gras se séparerait)..."` | **New:** `"Une texture de sable mouillé : ni chaude (le beurre se séparerait)..."` | **Why:** More appetizing and accurate French pastry wording.
126. `fr.steps[6].text` — **Old:** `"Disposez côté spirale vers le haut, serrés sans se chevaucher. Couvrez sans serrer... Préchauffez à..."` | **New:** `"Disposez-les spirale vers le haut, bien rapprochés sans se chevaucher. Couvrez sans serrer... Préchauffez le four à..."` | **Why:** Removes awkward repetition of `serrer`/`serrés` and adds explicit „le four“.
127. `fr.steps[6].cue` — **Old:** `"Une pression du doigt remonte lentement... trop poussé."` | **New:** `"Sous une légère pression du doigt, la pâte remonte lentement en gardant une petite empreinte. Creux profond = trop poussée."` | **Why:** Fixes subject („la pâte“ springs back, not „une pression“) and feminine agreement.
128. `fr.steps[8].text` — **Old:** `"Fouettez le cream cheese et le beurre bien lisses..."` | **New:** `"Fouettez le fromage frais et le beurre jusqu’à obtenir une texture bien lisse..."` | **Why:** Consistent French term `fromage frais` and idiomatic French syntax.

### `content/recipes/fudge-brownies.json` (5 fixes)
129. `fr.steps[0].text` — **Old:** `"Chemisez une plaque de papier cuisson..."` | **New:** `"Tapissez une plaque de papier cuisson..."` | **Why:** In French baking, you „tapisser“ a flat tray (`plaque`) and „chemiser“ a tin/mould.
130. `fr.steps[1].text` — **Old:** `"...puis tamisez ensemble."` | **New:** `"...puis tamisez le tout."` | **Why:** Natural French instead of literal “sift them together”.
131. `fr.steps[2].text` — **Old:** `"...jusqu’à ce que le mélange soit crémeux. Incorporez le mélange chocolat-beurre... Versez le lait ribot doucement à la fin."` | **New:** `"...jusqu’à obtenir une préparation crémeuse. Incorporez le mélange chocolat-beurre... Versez doucement le lait ribot à la fin."` | **Why:** Eliminates „mélange“ repetition and improves adverb placement.
132. `fr.tips[0].text` — **Old:** `"Remplissez farine et cacao à la cuillère sans tasser... sans bulles d’air."` | **New:** `"Prélevez la farine et le cacao à la cuillère sans tasser... sans laisser de bulles d’air."` | **Why:** Fixes awkward verb (`remplir` takes the cup, not the flour) and smooths phrasing.
133. `fr.tips_grams[1].text` — **Old:** `"175 g de couverture = ... Hachez-le finement..."` | **New:** `"175 g de chocolat de couverture = ... Hachez-le finement..."` | **Why:** Fixes gender agreement (`couverture` is feminine, `chocolat de couverture` matches `le`/`il`).

### `content/recipes/lotus-cheesecake.json` (9 fixes)
134. `fr.groups[2].title` — **Old:** `"Le nappage et décor"` | **New:** `"Le nappage et le décor"` | **Why:** Natural French repeats the article before paired nouns.
135. `fr.steps[0].title` — **Old:** `"Émietter + fondre."` | **New:** `"Émietter et faire fondre."` | **Why:** `fondre` is intransitive; transitive action requires `faire fondre`.
136. `fr.steps[1].text` — **Old:** `"...tassez bien lisse avec une cuillère..."` | **New:** `"...tassez uniformément avec une cuillère..."` | **Why:** Replaces literal calque „tassez bien lisse“ (“press it smooth”).
137. `fr.steps[2].title` — **Old:** `"Garnir + premier froid."` | **New:** `"Garnir et premier passage au frais."` | **Why:** „premier froid“ is unnatural in French.
138. `fr.steps[2].text` — **Old:** `"Détachez avec un couteau chaud..."` | **New:** `"Décollez les bords avec un couteau chaud..."` | **Why:** Clearer, idiomatic French baking wording.
139. `fr.steps[3].title` — **Old:** `"Fondre le nappage."` | **New:** `"Faire fondre le nappage."` | **Why:** Fixes ungrammatical transitive use of `fondre`.
140. `fr.steps[3].text` — **Old:** `"Trop chaud et ça brûle. Versez sur le cheesecake refroidi..."` | **New:** `"Trop chaud, elle brûle. Versez sur le cheesecake bien froid..."` | **Why:** Feminine pronoun agrees with `pâte à tartiner`; „bien froid“ is accurate for a no-bake cheesecake (never heated, so not „refroidi“).
141. `fr.steps[3].cue` — **Old:** `"Fluide à verser, sans bouillir ni brunir."` | **New:** `"Assez fluide pour être versée, sans bouillir ni brunir."` | **Why:** Natural French phrasing with feminine agreement (`pâte à tartiner`).
142. `fr.steps[4].title` — **Old:** `"Décor, puis trancher."` | **New:** `"Décorer, puis trancher."` | **Why:** Parallel verb structure across all step titles.

### `content/recipes/protein-cloud-cheesecake.json` (7 fixes)
143. `fr.stats[2].value` — **Old:** `"~100 kcal · 8 g protéines"` | **New:** `"~100 kcal · 8 g de protéines"` | **Why:** Proper French partitive preposition (`de`).
144. `fr.steps[0].text` — **Old:** `"Four à 170 °C ..."` | **New:** `"Préchauffez le four à 170 °C ..."` | **Why:** Consistent imperative style across steps.
145. `fr.steps[1].text` — **Old:** `"...Séparez les œufs. ..."` | **New:** `"...Séparez les blancs des jaunes. ..."` | **Why:** Idiomatic French pastry phrasing.
146. `fr.steps[1].cue` — **Old:** `"Becs fermes et brillants qui tiennent tout seuls."` | **New:** `"Neige ferme et brillante qui tient bien."` | **Why:** Natural French pastry phrasing for stiff glossy peaks.
147. `fr.steps[2].text` — **Old:** `"...puis incorporez."` | **New:** `"...puis incorporez-les."` | **Why:** `incorporer` requires an object pronoun in French.
148. `fr.steps[5].title` — **Old:** `"Refroidir, démouler, trancher."` | **New:** `"Laissez refroidir, démoulez, tranchez."` | **Why:** Matches imperative step titles and avoids transitive „refroidir“.
149. `fr.steps[5].text` — **Old:** `"...si vous voulez et coupez 8 parts."` | **New:** `"...si vous le souhaitez et coupez en 8 parts."` | **Why:** Smoother register and proper preposition (`couper en 8 parts`).

### `content/recipes/topfenschmarren.json` (7 fixes)
150. `fr.stats[2].value` — **Old:** `"470 kcal · 48 g protéines"` | **New:** `"470 kcal · 48 g de protéines"` | **Why:** Proper French preposition (`de`).
151. `fr.groups[1].items[1].name` — **Old:** `"fruits frais ou compote"` | **New:** `"fruits ou compote"` | **Why:** Matches English “fruit or compote” without adding “fresh”.
152. `fr.steps[0].text` — **Old:** `"Séparez les œufs. ..."` | **New:** `"Séparez les blancs des jaunes. ..."` | **Why:** Idiomatic French pastry phrasing.
153. `fr.steps[1].text` — **Old:** `"...Trop épais ? Un filet d’eau suffit."` | **New:** `"...Pâte trop épaisse ? Un filet d’eau suffit."` | **Why:** Proper feminine agreement with `pâte`.
154. `fr.steps[1].cue` — **Old:** `"Épais, mais toujours onctueux."` | **New:** `"Épaisse, mais toujours onctueuse."` | **Why:** Feminine agreement with `pâte`.
155. `fr.steps[3].text` — **Old:** `"Faites fondre le beurre à feu MOYEN. Étalez la pâte sur 0.5–1 cm d’épaisseur. ..."` | **New:** `"Faites fondre la matière grasse à feu MOYEN. Étalez la pâte sur 0,5–1 cm d’épaisseur. ..."` | **Why:** Matches English “Melt the fat” (covers both butter and coconut oil) and uses the French decimal comma (`0,5`).
156. `fr.tips[0].text` — **Old:** `"...et le zeste au goût."` | **New:** `"...et le zeste à doser selon votre goût."` | **Why:** Natural Metropolitan French phrasing instead of literal „au goût“.
