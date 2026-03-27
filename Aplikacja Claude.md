
# Aplikacja FIN — Lista wymogów

## Wymagania funkcjonalne

1. Aplikacja ma odtwarzać logikę załączonego arkusza excel (`policzenie ile mam kasy.xlsx`):
   - Suma aktywów przeliczona na PLN po bieżących kursach walut
   - Odliczanie od aktywów tylko wydatków **nieoznaczonych jako wykonane**
   - Wynik: kwota dostępna = suma aktywów (PLN) − suma wydatków pending

2. Aplikacja ma synchronizować kursy walut z serwisu **Frankfurter API** (api.frankfurter.app):
   - Dane z Europejskiego Banku Centralnego (ECB)
   - Darmowe, bez klucza API
   - Cache kursów przez 1 godzinę
   - Obsługa dowolnej waluty dostępnej w ECB (lista pobierana z API)

3. Aplikacja ma zawierać ekran **Assets** umożliwiający zarządzanie aktywami:
   - Dodawanie, edycja, usuwanie aktywów
   - Każde aktywo: nazwa, kwota, waluta (wybór z pełnej listy walut ECB)
   - Domyślna waluta pobierana z ustawień użytkownika
   - Wartości przeliczane do PLN na bieżąco

4. Aplikacja ma zawierać ekran **Expenses** umożliwiający zarządzanie wydatkami:
   - Dodawanie, edycja, usuwanie wydatków
   - Każdy wydatek: nazwa, kwota (w PLN)
   - Filtrowanie: wszystkie / pending / done
   - Podsumowanie: suma pending i suma done

5. Aplikacja ma zawierać możliwość zaznaczenia wydatku jako **wykonanego (done)**:
   - Wydatki oznaczone jako done **nie są odliczane** od aktywów (już zapłacone)
   - Wydatki bez oznaczenia (pending) **są odliczane** od sumy aktywów
   - Toggle jednym kliknięciem

6. Aplikacja ma zawierać możliwość wybrania waluty dla każdego aktywa:
   - Pełna lista walut z Frankfurter API
   - Domyślna waluta ustawiana w ekranie Settings
   - Nowe aktywa domyślnie przyjmują walutę z ustawień

7. Aplikacja ma być **mobilna, na iOS**:
   - Zbudowana w **React Native + Expo (TypeScript)**
   - Expo SDK 55, Expo Router (nawigacja plikowa)
   - Docelowo publikacja na App Store

## Wymagania techniczne

### Technologia
- **Framework:** React Native + Expo (TypeScript)
- **Routing:** Expo Router (file-based)
- **Backend:** Firebase (Auth + Firestore)
- **API kursów walut:** Frankfurter (ECB) — https://api.frankfurter.app

### Autoryzacja
- Logowanie przez **Google Sign-In** i **Apple Sign-In**
- Użytkownik **nie konfiguruje nic** — logowanie jednym kliknięciem
- Firebase konfigurowany raz przez developera (klucze w `.env`)
- Dane każdego użytkownika są prywatne (Firestore Security Rules per userId)

### Dane
- Przechowywanie: **Firebase Firestore** (chmura, synchronizacja między urządzeniami)
- Real-time listeners — zmiany widoczne natychmiast na wszystkich urządzeniach
- Struktura: `users/{userId}/assets`, `users/{userId}/expenses`, `users/{userId}/settings`

### Język interfejsu
- **Angielski**

## Ekrany

| Ekran | Opis |
|-------|------|
| Login | Przyciski "Continue with Google" i "Sign in with Apple" |
| Dashboard | Suma aktywów (PLN), wydatki pending, kwota dostępna; breakdown aktywów i wydatków |
| Assets | Lista aktywów z CRUD, badge waluty, przeliczenie na PLN |
| Expenses | Lista wydatków z CRUD, toggle done, filtry, podsumowanie |
| Settings | Domyślna waluta (picker), informacja o koncie, wylogowanie |

## Decyzje podjęte podczas rozmowy

- **Sekcja "Szanse na drugie wspólne"** z arkusza — pominięta (nie wdrażana)
- **Wydatek "spłata karty"** z dwiema kwotami (4200 / 17000) — w aplikacji każdy wydatek ma jedną kwotę; user może dodać dwa osobne wpisy
- **iCloud** jako storage — zastąpiony Firestore (brak konfiguracji po stronie użytkownika)
- **Anonymous auth** — odrzucone; dane finansowe wymagają weryfikacji tożsamości
- **Waluty** — dowolna waluta z listy ECB (nie tylko CHF/EUR/PLN jak w arkuszu)
