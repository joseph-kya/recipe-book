# Translation Review Log (`tr-de-b`)

Scope: German (`de` and `amounts_credit.de`) blocks of the remaining recipe files in `content/recipes/` (from the 4th file alphabetically):
- `content/recipes/lotus-cheesecake.json` (21 fixes)
- `content/recipes/protein-cloud-cheesecake.json` (24 fixes)
- `content/recipes/topfenschmarren.json` (19 fixes)

Total fixes: **64**

Consistent Austrian/German baking-book choices applied across all 3 files:
- Warm `du`-imperative in all method steps (replacing infinitive style and mixed forms)
- Consistent Austrian baking vocabulary: `Topfen`/`Magertopfen`, `Staubzucker`, `Backrohr`, `Eiklar`/`Dotter`, `Nudelwalker`, `flaumig`, `Bräter`
- Removed anglicisms (`Topping` → `Guss`, `fluffig` → `flaumig`) and literal calques (`Das gute Zeug` → `Die guten Sachen`, `Jetzt wird's chaotisch.` → `Ärmel hoch und los.`)
- Fixed German punctuation/typography (`0.5–1 cm` → `0,5–1 cm`, `~10%` → `~10 %`, `Frischkäseschicht`, `selbst gemacht`)

---

## `content/recipes/lotus-cheesecake.json` (21 fixes)

| Field | Old | New | Why |
|---|---|---|---|
| `amounts_credit.de.src` | `ungefähr (King Arthur + Kekskrümel ~100 g/Tasse, Frischkäse ~232 g/Tasse)` | `ca. (King Arthur + Kekskrümel ~100 g/Tasse, Frischkäse ~232 g/Tasse)` | Concise standard German abbreviation matching EN `approx.` |
| `de.intro` | `Ein knuspriger Lotus-Boden, eine cremige Frischkäse-Schicht und geschmolzene Biscoff-Creme obendrauf. Kein Ofen, keine Gelatine — nur zweimal geduldig kühlen.` | `Ein knuspriger Lotus-Boden, eine cremige Frischkäseschicht und geschmolzene Biscoff-Creme obendrauf. Kein Backrohr, keine Gelatine — nur zweimal geduldig kühlen.` | Correct closed German compound (`Frischkäseschicht`) and consistent Austrian `Backrohr` |
| `de.equipment` | `Springform 20 cm (8 Zoll), Backpapier, kleiner Zerkleinerer oder Gefrierbeutel + Nudelholz, kleiner Topf, Tortenring, Tortenplatte.` | `20-cm-Springform (8 Zoll), Backpapier, kleiner Zerkleinerer oder Gefrierbeutel + Nudelwalker, kleiner Topf, Tortenring, Tortenplatte.` | Natural German compound (`20-cm-Springform`) and Austrian `Nudelwalker` |
| `de.ingredients_headline` | `Das gute Zeug` | `Die guten Sachen` | Replaces literal/clunky translation of "The good stuff" with warm, natural German |
| `de.groups[1].items[1].note` | `gekauft oder selbstgemacht` | `gekauft oder selbst gemacht` | Duden-preferred spelling in predicative use |
| `de.groups[1].items[2].name` | `Puderzucker` | `Staubzucker` | Authentic Austrian baking term |
| `de.groups[2].title` | `Topping & Deko` | `Guss & Deko` | Removes anglicism `Topping` in favor of proper baking term `Guss` |
| `de.groups[2].items[0].note` | `gekauft oder selbstgemacht` | `gekauft oder selbst gemacht` | Duden-preferred spelling in predicative use |
| `de.method_headline` | `Jetzt wird's chaotisch.` | `Ärmel hoch und los.` | Replaces literal translation of "Let's make a mess." with warm, idiomatic baking-book tone |
| `de.steps[0].text` | `Die 200 g Kekse im kleinen Zerkleinerer fein mahlen (oder im Gefrierbeutel mit dem Nudelholz zerdrücken). Die Butter in einem kleinen Topf bei schwacher Hitze schmelzen. Die Krümel unterrühren.` | `Mahle die 200 g Kekse in einem kleinen Zerkleinerer zu feinen Krümeln (oder zerdrücke sie in einem Gefrierbeutel mit dem Nudelwalker). Lass die Butter in einem kleinen Topf bei schwacher Hitze schmelzen und rühre die Krümel unter.` | `du`-imperative, faithfully renders "to fine crumbs", Austrian `Nudelwalker`, smoother flow |
| `de.steps[0].cue` | `Feine Krümel, gleichmäßig von Butter durchfeuchtet.` | `Feine Krümel, gleichmäßig mit Butter durchzogen.` | Replaces stilted literal "von Butter durchfeuchtet" with idiomatic baking phrasing |
| `de.steps[1].text` | `Eine 20-cm-Springform mit Backpapier auslegen. Die Krümelmasse hineingeben und mit einem Löffel oder dem Boden eines Glases glatt drücken.` | `Lege eine 20-cm-Springform mit Backpapier aus. Gib die Krümelmasse hinein und drücke sie mit einem Löffel oder dem Boden eines Glases glatt an.` | `du`-imperative and natural baking verb `glatt andrücken` |
| `de.steps[2].text` | `Frischkäse mit den 200 g Creme und dem Puderzucker verrühren. Auf den Boden streichen und glattziehen. Mindestens 1 Stunde kaltstellen. Mit einem heißen Messer vom Rand lösen, auf eine Tortenplatte setzen und einen Tortenring darum spannen.` | `Verrühre den Frischkäse mit den 200 g Creme und dem Staubzucker. Verteile die Masse auf dem Boden und streiche sie glatt. Stelle den Kuchen mindestens 1 Stunde kalt. Löse ihn mit einem heißen Messer vom Rand, setze ihn auf eine Tortenplatte und spanne einen Tortenring darum.` | `du`-imperative, `Staubzucker`, natural `glatt streichen` instead of `glattziehen` |
| `de.steps[3].title` | `Topping schmelzen.` | `Guss schmelzen.` | Removes anglicism `Topping` |
| `de.steps[3].text` | `Die restlichen 200 g Creme in einem Topf unter Rühren bei schwacher Hitze schmelzen. Zu heiß und sie brennt an. Über den gekühlten Cheesecake gießen und glattstreichen. Noch mindestens 1 Stunde kaltstellen.` | `Lass die restlichen 200 g Creme in einem Topf bei schwacher Hitze unter Rühren schmelzen — wird sie zu heiß, brennt sie an. Gieße sie über den gekühlten Cheesecake und streiche sie glatt. Stelle ihn noch mindestens 1 Stunde kalt.` | `du`-imperative and removes English calque "Zu heiß und sie brennt an." |
| `de.steps[3].cue` | `Gießfähig, nicht blubbernd oder gebräunt.` | `Schön flüssig, ohne Blasen und nicht gebräunt.` | Replaces technical "Gießfähig" with warm, natural baking language |
| `de.steps[4].text` | `Kurz vor dem Servieren 5 der 6 Kekse zerbröseln und die Krümel am Rand des Toppings verteilen. Den letzten Keks in die Mitte setzen. Den Tortenring vorsichtig abnehmen (vorher mit einem heißen Messer am Rand entlangfahren). Ergibt ca. 12 Stücke. Hält gekühlt 3–4 Tage.` | `Zerbrösle kurz vor dem Servieren 5 der 6 Kekse und streue die Krümel rund um den Rand des Gusses. Setze den letzten Keks in die Mitte. Nimm den Tortenring vorsichtig ab (fahre vorher mit einem heißen Messer am Rand entlang). Ergibt ca. 12 Stücke. Hält gekühlt 3–4 Tage.` | `du`-imperative, removes anglicism `Topping` (`Gusses`), natural `streue ... rund um` |
| `de.tips[0].text` | `Krümel ~100 g/Tasse (~32 Kekse für den Boden; 1 Lotus ≈ 6,25 g). Frischkäse ~232 g/Tasse, damit sind 700 g fast genau 3 Tassen. Lotus-Creme ~16–17 g/EL, ¾ Tasse kommt also gut hin. Puderzucker nach King Arthur 113 g/Tasse.` | `Krümel ~100 g/Tasse (~32 Kekse für den Boden; 1 Lotus ≈ 6,25 g). Frischkäse ~232 g/Tasse, damit sind 700 g fast genau 3 Tassen. Lotus-Creme ~16–17 g/EL, ¾ Tasse kommt also gut hin. Staubzucker liegt bei 113 g/Tasse (King Arthur).` | `Staubzucker` and natural full sentence for King Arthur conversion |
| `de.tips[1].title` | `Kein Ofen, keine Gelatine.` | `Kein Backrohr, keine Gelatine.` | Consistent Austrian `Backrohr` |
| `de.tips[1].text` | `Er wird im Kühlschrank fest. Ein Tortenring hält die Seiten nach dem Ausformen in Form. Einfach Backen schlägt außerdem frische Beeren obendrauf vor oder Zitronenabrieb in der Füllung. 4354 kcal für den ganzen Kuchen (deren Angabe).` | `Er wird einfach im Kühlschrank fest. Ein Tortenring hält den Rand nach dem Ausformen schön in Form. Einfach Backen schlägt außerdem frische Beeren obendrauf oder Zitronenabrieb in der Füllung vor. 4354 kcal für den ganzen Kuchen (laut Originalrezept).` | Natural `Rand` instead of `Seiten` for round cake, cleaner verb bracket (`... vor`), replaces clunky `(deren Angabe)` |
| `de.conversions` | `Ungefähre Tassenangaben; Krümel ~100 g/Tasse, Frischkäse ~232 g/Tasse, Lotus-Creme ~16–17 g/EL, Puderzucker 113 g/Tasse` | `Ungefähre Tassenangaben; Krümel ~100 g/Tasse, Frischkäse ~232 g/Tasse, Lotus-Creme ~16–17 g/EL, Staubzucker 113 g/Tasse` | Consistent `Staubzucker` |

---

## `content/recipes/protein-cloud-cheesecake.json` (24 fixes)

| Field | Old | New | Why |
|---|---|---|---|
| `amounts_credit.de.src` | `ungefähr (King Arthur + Quark ~240 g/Tasse)` | `ca. (King Arthur + Topfen ~240 g/Tasse)` | Concise `ca.` and consistent Austrian `Topfen` |
| `de.tagline` | `Fluffig, leicht, eiweißreich. Ohne Boden, ohne Aufwand.` | `Flaumig, leicht, eiweißreich. Ohne Boden, ohne Aufwand.` | Replaces anglicism `Fluffig` with warm Austrian baking term `Flaumig` |
| `de.sticker[1]` | `Fluffig!` | `Flaumig!` | Replaces anglicism `Fluffig` with `Flaumig` |
| `de.intro` | `LECKERs viraler Wölkchenkuchen: Quark und Eischnee, sanft im Wasserbad gebacken.` | `LECKERs viraler Wölkchenkuchen: Topfen und Eischnee, sanft im Wasserbad gebacken.` | Consistent Austrian `Topfen` |
| `de.stats[1].label` | `im Ofen` | `im Backrohr` | Consistent Austrian `Backrohr` |
| `de.equipment` | `Springform 18 cm (7 Zoll), Backpapier, Alufolie, große Bratform, Handmixer, kleiner Zerkleinerer.` | `18-cm-Springform (7 Zoll), Backpapier, Alufolie, großer Bräter, Handmixer, kleiner Zerkleinerer.` | Natural German `18-cm-Springform` and idiomatic `großer Bräter` instead of rare `Bratform` |
| `de.ingredients_headline` | `Das gute Zeug` | `Die guten Sachen` | Warm, natural German headline |
| `de.groups[0].items[3].note` | `die Prise kommt zum Eischnee` | `die Prise kommt zum Eiklar` | Factually accurate (added to egg whites before/while whipping, not to finished Eischnee) and Austrian `Eiklar` |
| `de.groups[0].items[4].name` | `Magerquark` | `Magertopfen` | Consistent Austrian baking term |
| `de.groups[0].items[5].note` | `~10% Fett` | `~10 % Fett` | Proper German typography (space before `%`) |
| `de.groups[0].items[10].metric` | `wahlweise` | `nach Belieben` | Warmer, more natural recipe-book phrasing than bureaucratic `wahlweise` |
| `de.groups[0].items[10].name` | `Puderzucker` | `Staubzucker` | Authentic Austrian baking term |
| `de.method_headline` | `Jetzt wird's chaotisch.` | `Ärmel hoch und los.` | Natural, warm baking-book headline |
| `de.steps[0].text` | `Ofen auf 170 °C (150 °C Umluft), Rost auf die mittlere Schiene. Bratform daraufstellen und ~3 cm heißes Wasser einfüllen. Boden und Rand der Springform mit Backpapier auslegen; außen fest mit Alufolie umwickeln.` | `Heize das Backrohr auf 170 °C (150 °C Umluft) vor und schiebe den Rost auf die mittlere Schiene. Stelle den Bräter darauf und fülle ihn etwa 3 cm hoch mit heißem Wasser. Lege Boden und Rand der Springform mit Backpapier aus und wickle sie außen dicht in Alufolie ein.` | `du`-imperative, `Backrohr`, `Bräter`, idiomatic `etwa 3 cm hoch mit heißem Wasser` |
| `de.steps[0].cue` | `Folie rundherum dicht anlegen, damit kein Wasser eindringt.` | `Die Folie liegt rundherum dicht an — kein Spalt fürs Wasser.` | Natural state cue matching EN instead of infinitive command |
| `de.steps[1].text` | `Die 5 EL und 3 EL Erythrit getrennt zu Pulver mahlen. Eier trennen. Eiweiß mit Salz und der Prise Backpulver steif schlagen, dabei das Pulver aus den 5 EL einrieseln lassen.` | `Mahle die 5 EL und die 3 EL Erythrit getrennt zu feinem Pulver. Trenne die Eier. Schlage das Eiklar mit Salz und der Prise Backpulver steif und lass dabei die 5 EL Erythritpulver langsam einrieseln.` | `du`-imperative, Austrian `Eiklar` (avoids ambiguity with `Eiweiß` = protein), smoother `5 EL Erythritpulver` |
| `de.steps[2].text` | `Eigelb, das Pulver aus den 3 EL, Quark, Frischkäse, Milch und Vanille verrühren. Mehl, Maisstärke und ¼ TL Backpulver mischen und unterrühren.` | `Verrühre die Dotter mit den 3 EL Erythritpulver, Topfen, Frischkäse, Milch und Vanille. Mische Mehl, Maisstärke und ¼ TL Backpulver und rühre die Mischung unter.` | `du`-imperative, Austrian `Dotter` and `Topfen`, cleaner `3 EL Erythritpulver` |
| `de.steps[3].text` | `Eischnee mit einem Teigschaber in drei Portionen unterheben. In die Form füllen.` | `Hebe den Eischnee mit einem Teigschaber in drei Portionen unter und fülle die Masse in die Form.` | `du`-imperative and natural connected phrasing |
| `de.steps[3].cue` | `Keine weißen Schlieren, immer noch luftig.` | `Keine weißen Schlieren mehr, aber noch schön luftig.` | More natural German than literal "immer noch luftig" |
| `de.steps[4].text` | `Form ins Wasserbad stellen. 10 min backen, auf 150 °C (130 °C Umluft) herunterschalten und weitere ~45 min backen. Tür nicht öffnen!` | `Stelle die Form ins Wasserbad. Backe den Kuchen 10 min, schalte dann auf 150 °C (130 °C Umluft) herunter und backe ihn weitere ~45 min. Öffne die Backrohrtür nicht!` | `du`-imperative and consistent `Backrohrtür` |
| `de.steps[5].text` | `Komplett auskühlen lassen und aus der Form lösen. Nach Lust dünn mit Puderzucker bestäuben und in 8 Stücke schneiden.` | `Lass den Kuchen vollständig auskühlen und löse ihn aus der Form. Bestäube ihn, wenn du magst, dünn mit Staubzucker und schneide ihn in 8 Stücke.` | `du`-imperative, removes unidiomatic `Nach Lust` in favor of warm `wenn du magst`, `Staubzucker` |
| `de.steps[5].cue` | `Vor dem Schneiden ganz auskühlen lassen.` | `Vor dem Schneiden ganz ausgekühlt.` | Clean cue state instead of infinitive instruction |
| `de.tips[1].text` | `Laut LECKER lässt sich Erythrit 1:1 durch normalen Zucker ersetzen, ohne Mahlen. Dann hat ein Stück ~150 kcal und 8 g Eiweiß (deren Schätzung).` | `Laut LECKER lässt sich Erythrit 1:1 durch normalen Zucker ersetzen und muss nicht gemahlen werden. Dann hat ein Stück ~150 kcal und 8 g Eiweiß (Schätzung von LECKER).` | Smoother clause instead of clipped `ohne Mahlen` and avoids clunky `(deren Schätzung)` |
| `de.conversions` | `Ungefähre Tassenangaben; Quark ~240 g/Tasse, Maisstärke ~8 g/EL` | `Ungefähre Tassenangaben; Topfen ~240 g/Tasse, Maisstärke ~8 g/EL` | Consistent Austrian `Topfen` |

---

## `content/recipes/topfenschmarren.json` (19 fixes)

| Field | Old | New | Why |
|---|---|---|---|
| `amounts_credit.de.src` | `ungefähr (Topfen ~240 g/Tasse, Mehl ~120 g/Tasse)` | `ca. (Topfen ~240 g/Tasse, Mehl ~120 g/Tasse)` | Concise `ca.` matching EN `approx.` |
| `de.intro` | `Magertopfen und Eischnee, langsam bei mäßiger Hitze gebraten und in fluffige Stücke gezupft.` | `Magertopfen und Eischnee, langsam bei mäßiger Hitze gebraten und in flaumige Stücke gezupft.` | Replaces anglicism `fluffige` with warm Austrian `flaumige` |
| `de.ingredients_headline` | `Das gute Zeug` | `Die guten Sachen` | Warm, natural German headline |
| `de.groups[0].items[1].note` | `wahlweise` | `nach Belieben` | Warmer baking-book phrasing |
| `de.groups[0].items[6].name` | `geriebene Zitronenschale` | `abgeriebene Zitronenschale` | Standard culinary German for grated lemon zest |
| `de.groups[0].items[7].metric` | `wahlweise` | `nach Bedarf` | Natural phrasing when paired with "falls der Teig zu fest ist" |
| `de.method_headline` | `Jetzt wird's chaotisch.` | `Ärmel hoch und los.` | Warm, idiomatic baking-book headline |
| `de.steps[0].title` | `Eigelb trifft Topfen.` | `Dotter treffen Topfen.` | Consistent Austrian `Dotter` and plural agreement matching 2 yolks |
| `de.steps[0].text` | `Eier trennen. Topfen mit den 2 Eigelb (und dem Sauerrahm, falls du ihn verwendest) gut verrühren.` | `Trenne die Eier. Verrühre den Topfen mit den 2 Dottern (und dem Sauerrahm, falls du ihn verwendest) gründlich.` | Fixes mixed infinitive + `du`-form into consistent `du`-imperative; proper dative plural `2 Dottern` |
| `de.steps[1].title` | `Geschmack rein.` | `Teig verfeinern.` | Replaces clipped literal translation of "Flavour it." with natural baking headline |
| `de.steps[1].text` | `Mehl, Süßungsmittel, Zitronenschale und Salz dazugeben. Zu fest? Ein Schuss Wasser hilft.` | `Gib Mehl, Süßungsmittel, Zitronenschale und Salz dazu. Zu fest? Ein Schuss Wasser hilft.` | Consistent `du`-imperative (`Gib`) |
| `de.steps[1].cue` | `Dick, aber cremig.` | `Dickflüssig, aber cremig.` | Proper baking term for thick batter (`dickflüssig`, not `dick`) |
| `de.steps[2].text` | `Eiweiß steif schlagen und langsam unterheben.` | `Schlage das Eiklar steif und hebe es langsam unter.` | `du`-imperative and consistent Austrian `Eiklar` |
| `de.steps[3].text` | `Fett bei MITTLERER Hitze schmelzen. Teig 0.5–1 cm dick verstreichen. ~5 min braten, bis er anfängt zu stocken, wenden und weitere ~5 min braten.` | `Lass das Fett bei MITTLERER Hitze schmelzen und verstreiche den Teig 0,5–1 cm dick in der Pfanne. Brate ihn ~5 min, bis er anfängt zu stocken, wende ihn und brate ihn weitere ~5 min.` | Fixes English decimal point (`0.5` → `0,5`) and converts to `du`-imperative |
| `de.steps[4].text` | `Hitze aus, Deckel drauf, 5 min ruhen lassen.` | `Schalte die Hitze aus, lege den Deckel auf und lass den Schmarren 5 min ruhen.` | Consistent `du`-imperative |
| `de.steps[5].title` | `Zupfen und belegen.` | `Zupfen und anrichten.` | `belegen` is for bread/pizza; `anrichten` fits serving Schmarren with fruit/compote |
| `de.steps[5].text` | `Deckel abnehmen, in Stücke zupfen und Obst oder Kompott daraufgeben.` | `Nimm den Deckel ab, zupfe den Schmarren in Stücke und gib Obst oder Kompott darüber.` | Consistent `du`-imperative and natural `darüber` for "pile on" |
| `de.steps[5].cue` | `Fluffige, goldbraune Stücke.` | `Flaumige, goldbraune Stücke.` | Replaces anglicism `Fluffige` with warm Austrian `Flaumige` |
| `de.tips[0].text` | `Am Rezept keine: Mengen und Schritte stammen von Susanna. Die Tassenangaben sind unsere ungefähren Umrechnungen. Süßungsmittel, Fett und Zitronenschale lässt sie nach Geschmack dosieren.` | `Am Rezept selbst keine: Mengen und Schritte stammen von Susanna. Die Tassenangaben sind unsere ungefähren Umrechnungen. Süßungsmittel, Fett und Zitronenschale lässt sie nach Geschmack dosieren.` | Smoother natural rhythm (`Am Rezept selbst keine:`) |
