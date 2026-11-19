# Planul ideilor propuse

Acesta este un inventar de lucru, nu o listă de funcții deja livrate. „Parțial” înseamnă că există elemente în joc, nu că propunerea este completă. Orice modificare a economiei sau a simulării trebuie să păstreze salvările existente, să explice efectele și să aibă teste; schimbările vizuale necesită și verificare în browser real.

## Meci și tactică
- [ ] Indicii pentru tipul fazei și explicații discrete pe reluări; cameră de urmărire a unui jucător; accesibilitate 3D, contrast și mișcare redusă. Parțial: reluarea automată a golului arată sursa înregistrată (sau necunoscută), minutul și echipa în 2D/3D, fără a atribui cauzalitate; celelalte faze și camera dedicată rămân de făcut.
- [ ] Planuri de meci condiționale și instrucțiuni pe perioade; adversari care se pregătesc pentru tactica ta, inclusiv echipe mai slabe cu planuri distincte. Parțial: în meciul live se poate activa o regulă de scor și minut, executată o singură dată; nu se aplică în simularea rapidă și adversarul ajustează tacticile inițiale la câteva setări premeci, în meciul live și simularea rapidă. Nu există încă instrucțiuni pe perioade sau adaptare la schimbările tactice live.
- [ ] Faze fixe personalizate; pregătire pentru meciuri decisive; discuții la pauză legate de desfășurarea reprizei. Parțial: o discuție opțională folosește scorul și xG pentru recomandare și acordă un impuls limitat în primele 10 minute ale reprizei a doua; fazele fixe și pregătirea decisivelor rămân de făcut.
- [ ] Profiluri de arbitri; meteo cu efecte explicate; atmosferă de stadion contextuală; rivalități care evoluează. Parțial: înaintea meciului sunt explicate profilul simulat și efectele meteo live; simularea rapidă nu le folosește.
- [ ] Analiza golurilor primite și rezumat postmeci care separă observațiile de cauzalitatea incertă. Parțial: rezumatul live clasifică sursa înregistrată a golurilor primite, inclusiv sursa necunoscută, fără a presupune cauzalitate; nu există arhivă detaliată sau analiză completă.

## Lot, antrenament și transferuri
- [x] Comparație între doi jucători pe baza datelor disponibile și recomandări informative de rotație care respectă postul și U21.
- [ ] Obiective individuale bazate pe minute și evoluție; oboseală mentală; program medical și riscuri la revenire. Parțial: până la trei obiective individuale urmăresc îmbunătățirile reale din antrenamentul individual, în sezonul curent, fără recompense; există și obiective care numără doar minutele confirmate în meciurile de campionat live, fără simulări rapide, cupe sau istoric anterior. Infirmeria explică probabilitățile tratamentelor existente, indisponibilitatea și suspendările; recuperarea blândă nu creează accidentări pentru jucătorii doar obosiți. Nu există un program de revenire sau o probabilitate persistentă de recidivă după tratament.
- [ ] Vestiar reactiv, concurență pe post, roluri promise și integrarea transferurilor. Parțial: promisiunile de minute și titularizare verifică participarea reală până la termen, cu amânare la indisponibilitate; restul rămâne de făcut.
- [ ] Parteneriate și chimie bazate pe meciuri; tutori pentru juniori și academie cu identitate. Parțial: există mecanisme de mentorat și un indicator de conexiuni, nu întreaga propunere.
- [ ] Piață concurențială, observatori cu rapoarte incerte, probe pentru jucători liberi, împrumuturi urmărite, negocieri cu memorie și clauze contractuale.
- [x] Trei formule de lot salvate per club, cu validare la aplicare și păstrarea tacticii curente.
- [ ] Staff cu profiluri distincte și delegare controlabilă.

## Relații și viață personală
- [ ] Promisiuni urmărite cu termene și consecințe, jurnal de relație și conversații care țin cont de trecut. Parțial: cererile/promisiunile de întâlnire au termen, consecință unică și jurnal pentru momentele noi; alte tipuri de promisiuni și conversații mai variate rămân de făcut.
- [ ] Preferințe de comunicare descoperite treptat, momente fără recompense obligatorii, calendar personal influențat de deplasări și oboseală.
- [ ] Evenimente comunitare și interacțiuni cu suporterii.

## Club și carieră
- [ ] Proiecte ale clubului cu obiective sportive măsurabile; identitatea clubului; cereri negociabile ale conducerii și obiective de sezon negociate.
- [ ] Rapoarte financiare, costuri viitoare, organizarea deplasărilor și alegeri de carieră cu oferte distincte. Parțial: situația clubului estimează veniturile și costurile recurente la fiecare patru etape, fără tranzacțiile variabile; nu prezice bugetul viitor.
- [x] Obiective personale de campionat cu ținte alese de utilizator, progres bazat pe rezultate și fără recompense automate.
- [ ] Licențe de antrenor cu cerințe practice; conferințe care urmăresc declarațiile anterioare.
- [ ] Cronică de sezon, arhivă și recorduri, comparații între sezoane și vizualizarea loturilor/clasamentelor istorice; birou personalizat. Parțial: la tranziție se arhivează clasamentul final și lotul actual pentru cel mult 10 campionate complete; istoricul vechi nu este reconstruit, iar ultimele două sezoane arhivate pentru clubul și liga curentă pot fi comparate după loc și puncte. Recordurile de clasare și puncte sunt calculate doar din arhiva clubului și ligii actuale, nu din toată istoria sau exclusiv din mandatul managerului. Cronica și comparațiile extinse rămân de făcut.

## Interfață și transparență
- [x] Centru de notificări cu mesaje active, promisiuni, șantiere și acces la secțiunile relevante.
- [ ] Jurnal unificat al deciziilor și promisiunilor active din toate sistemele. Parțial: jurnalul comun afișează promisiunile active față de jucători și partenere, ultimele decizii de club și momentele înregistrate în relații; nu include toate sistemele și nu reconstruiește istoricul salvărilor vechi.
- [ ] Ecran principal mai aerisit, navigare mobilă simplificată, carduri și dialoguri mai lizibile, progres clar, dimensiune de text și contrast reglabile.
- [ ] Verificare vizuală și interacțiuni pe telefon și desktop, inclusiv 2D, 3D, Radio și pauză; jsdom nu înlocuiește WebGL sau testarea mobilă reală.
