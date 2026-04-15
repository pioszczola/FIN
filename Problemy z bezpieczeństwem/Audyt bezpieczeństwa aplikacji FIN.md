

Let me start by exploring the FIN application folder structure and reading the code files.Let me read all the source files now. I'll start with the lib, hooks, constants, and app directories in parallel.Now let me read all the app screen files:Now let me also check the remaining config files:Przeczytałem cały kod aplikacji FIN — React Native / Expo Router z Firebase + Frankfurter API. Oto moje ustalenia z code review:

---

## 1. BEZPIECZEŃSTWO (krytyczne)

**1.1 Brak reguł bezpieczeństwa Firestore (lub ich niewidoczność)** Cała warstwa `firestore.ts` operuje na ścieżkach `users/{userId}/...` — ale nigdzie w repozytorium nie ma pliku `firestore.rules`. Jeśli reguły nie zostały ustawione osobno w konsoli Firebase, oznacza to, że każdy zalogowany (w tym anonimowo) użytkownik może czytać i modyfikować dane dowolnego innego użytkownika, znając jego `uid`. To krytyczny problem bezpieczeństwa.

**1.2 Autentykacja wyłączona w produkcji** W `app/_layout.tsx` (linia 14) jest komentarz `// TODO: auth disabled for testing` — blok `useEffect` od razu przekierowuje do `(tabs)` niezależnie od stanu logowania. Ekran `login.tsx` jest martwy — nigdy nie zostanie pokazany użytkownikowi. Każdy użytkownik trafia bezpośrednio do aplikacji jako anonimowy.

**1.3 Anonimowe logowanie bez migracji** `useAuth.ts` automatycznie wywołuje `signInAnonymously`, jeśli nie ma zalogowanego użytkownika. Anonimowe konta Firebase tracą dane po reinstalacji lub wyczyszczeniu storage. Nie ma mechanizmu „link anonymous account" z kontem Google/Apple, więc użytkownik traci wszystkie dane.

---

## 2. LOGIKA BIZNESOWA — błędy i ryzyka



**2.2 `toPLN` — cichy fallback 1:1** `frankfurter.ts:38` — gdy brak kursu dla danej waluty, `toPLN` zwraca kwotę bez przeliczenia (fallback `return amount`). Użytkownik widzi np. 10 000 CHF pokazywane jako 10 000 PLN, bez żadnego ostrzeżenia na poziomie konkretnego aktywa. Banner `ratesUnavailable` pojawia się tylko przy globalnym błędzie fetch.

**2.3 Walidacja kwoty pozwala na `amount === 0`** Warunek `amount < 0` odrzuca ujemne wartości, ale 0 jest akceptowane. Aktywo o wartości 0 PLN ma wątpliwy sens.

**2.4 Pluralizacja z dwoma formami** `i18n.ts` ma tylko `items_one` i `items_other`, ale po polsku są trzy formy pluralizacji (1, 2–4, 5+). Dla 2–4 pozycji wyświetli się forma „pozycji" zamiast poprawnej „pozycje".

---

## 3. ARCHITEKTURA I JAKOŚĆ KODU

**3.1 Martwy plik `App.tsx`** Plik root `App.tsx` to domyślny boilerplate Expo. Nie jest używany — `package.json` ustawia `"main": "expo-router/entry"`. Plik `index.ts` z `registerRootComponent(App)` też jest martwy. Powinny zostać usunięte.

**3.2 Modułowy cache kursów walut — bez invalidacji** `frankfurter.ts` — zmienne `ratesCache` i `currenciesCache` żyją na poziomie modułu. Cache walut (`currenciesCache`) nie ma TTL, więc nie odświeży się nigdy po pierwszym pobraniu. Cache kursów ma 1h TTL — rozsądne, ale brak mechanizmu force-refresh (przycisk „refresh" na dashboardzie wywołuje `getRates()`, ale ta funkcja nadal zwróci cache, jeśli nie minęła godzina).

**3.3 Placeholder „TD" zamiast treści info modala** `assets.tsx:227` i `expenses.tsx:236` — modal informacyjny wyświetla literał `"TD"` (prawdopodobnie TODO). To widoczne dla użytkownika.

**3.4 Brak obsługi błędów w `onSnapshot`** Wszystkie wywołania `onSnapshot` w `firestore.ts` nie mają drugiego callbacka (error handler). Jeśli subskrypcja Firestore się zerwie (np. brak sieci, wygaśnięcie tokena), użytkownik nie dostanie żadnego feedbacku — dane po prostu przestaną się aktualizować.

**3.5 Wielokrotne tworzenie hooków per ekran** `useAuth()`, `useSettings()`, `useCurrencyRates()` itd. są wywoływane niezależnie w prawie każdym ekranie (dashboard, assets, expenses, history, settings, tab layout). Każde wywołanie tworzy osobną subskrypcję Firestore. Np. `useAuth()` jest wywoływane 6 razy = 6 osobnych listenerów `onAuthStateChanged`. Powinno być w React Context.

**3.6 Optymistyczny update w `useSettings` bez rollbacku** `useSettings.ts:23` — `setSettings(next)` jest wywoływany przed `saveSettings()`. Jeśli zapis do Firestore się nie powiedzie, UI pokazuje nowe ustawienia, ale serwer ma stare. Brak `try/catch` i rollbacku.

---

## 4. UX I WYDAJNOŚĆ

**4.1 `Dimensions.get('window')` — statyczne** `history.tsx:31` — `SCREEN_WIDTH` jest pobierane raz na poziomie modułu. Przy obrocie ekranu lub split view (iPad) wartość będzie nieaktualna i wykres się rozjedzie.

**4.2 Dashboard przelicza wszystko przy każdym renderze** Brak `useMemo`. `totalAssetsPLN`, `totalPendingPLN`, `availablePLN`, `doneExpenses`, `doneLabel` — wszystko jest obliczane od nowa przy każdym renderze. Przy kilkudziesięciu aktywach z przeliczaniem walut to może być odczuwalne.

**4.3 Toast w `history.tsx` — timer nie jest czyszczony przy odmontowaniu** `toastTimer.current` — `setTimeout` nie jest czyszczony w cleanup `useEffect`. Jeśli komponent się odmontuje przed upływem 2.5s, nastąpi `setState` na odmontowanym komponencie.

**4.4 `handleSaveSnapshot` jako zależność `useEffect`** W `history.tsx:87–93` — `handleSaveSnapshot` jest używany wewnątrz `useEffect` z pustą tablicą deps `[]`, ale sam zależy od `user`, `netBalance`, `t`. Przy pierwszym renderze `rates` mogą być puste, więc snapshot zapisze `netBalance = 0`. Efekt uruchomi się zanim dane się załadują.

---

## 5. BRAKI TYPÓW I DROBNE PROBLEMY

**5.1 Rzutowanie `as Asset` / `as Expense` bez walidacji** `firestore.ts` — dane z Firestore są rzutowane bezpośrednio na typy TypeScript (`as Asset`, `as Expense` itp.). Brak runtime validation — jeśli ktoś edytował dane bezpośrednio w konsoli Firebase (albo schemat się zmienił), aplikacja crashnie z trudem do zdiagnozowania.

**5.2 `@ts-ignore` w `firebase.ts`** Linia 4 — `getReactNativePersistence` jest importowane z wewnętrznej ścieżki `@firebase/auth/dist/rn/index.js` z `@ts-ignore`. Może się złamać przy aktualizacji Firebase SDK.

**5.3 Brak `.env` / `.env.example`** Kod używa 6 zmiennych `EXPO_PUBLIC_*`, ale nie ma pliku `.env.example` w repo. Nowy developer nie będzie wiedział, jakie zmienne są wymagane.

**5.4 `router.push('/history' as never)` — obejście typów** `app/_layout.tsx:27` — cast `as never` maskuje problem z typami routera Expo.

**5.5 Brak testów** Zero plików testowych w całym repo. Przy logice przeliczania walut i operacjach CRUD na danych finansowych to istotne ryzyko.

---

## 6. PODSUMOWANIE PRIORYTETÓW

Jeśli miałbym wskazać trzy rzeczy do naprawienia natychmiast, to: (1) włączenie/naprawienie autentykacji i reguł Firestore, (2) przeniesienie hooków do Context providera by uniknąć duplikacji subskrypcji, (3) obsługa błędów w `onSnapshot` i rollback w `useSettings`.