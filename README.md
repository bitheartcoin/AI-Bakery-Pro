# AI Bakery Pro - Intelligens Pékség Menedzsment Rendszer

AI Bakery Pro egy komplex, mesterséges intelligenciával támogatott pékség menedzsment rendszer, amely segíti a pékségek teljes körű irányítását, a termeléstől a szállításig.

## Főbb funkciók

- **Termelésirányítás**: Receptek, gyártási tételek, minőségbiztosítás
- **Készletkezelés**: Alapanyagok, késztermékek nyilvántartása, vonalkód és QR kód támogatás
- **Értékesítés**: POS rendszer, rendelések kezelése
- **Személyzet kezelés**: Alkalmazottak, beosztások, munkaidő nyilvántartás
- **Flotta menedzsment**: Járművek, szállítások, GPS nyomkövetés
- **Érzékelő monitoring**: Valós idejű adatok a sütőkről, hűtőkről, energiafogyasztásról
- **Biztonsági kamerarendszer**: BlueIris integráció
- **AI asszisztens**: Termelési javaslatok, optimalizálás
- **Időjárás előrejelzés**: Hatás a termelésre és szállításra
- **Szállásfoglalási előrejelzés**: Turisztikai adatok a termelés tervezéséhez

## Technológiák

- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React ikonok
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Functions)
- **Integráció**: Smart-MAC IoT platform, BlueIris kamerarendszer, TrackGPS flottakövetés

## Telepítés

1. Klónozd a repót:
   ```
   git clone https://github.com/felhasznalonev/ai-bakery-pro.git
   cd ai-bakery-pro
   ```

2. Telepítsd a függőségeket:
   ```
   npm install
   ```

3. Hozz létre egy `.env` fájlt a `.env.example` alapján:
   ```
   cp .env.example .env
   ```

4. Állítsd be a Supabase kapcsolatot a `.env` fájlban:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Indítsd el a fejlesztői szervert:
   ```
   npm run dev
   ```

## Adatbázis struktúra

A rendszer a következő fő adattáblákat használja:

- `profiles`: Felhasználói profilok és alkalmazotti adatok
- `recipes`: Receptek és termékek
- `production_batches`: Gyártási tételek
- `inventory`: Készletkezelés
- `orders`: Rendelések
- `vehicles`: Járművek
- `work_logs`: Munkaidő nyilvántartás
- `sensor_data`: Érzékelők adatai
- `locations`: Helyszínek (üzletek, raktárak)
- `schedules`: Beosztások
- `documents`: Dokumentumok

## Felhasználói szerepkörök

- **Admin**: Teljes hozzáférés minden funkcióhoz
- **Pék**: Termelés, receptek, készlet kezelése
- **Eladó**: Értékesítés, rendelések kezelése
- **Sofőr**: Szállítások, járművek kezelése

## Integráció

### Smart-MAC IoT platform

A rendszer a Smart-MAC IoT platformot használja a sütők, hűtők és egyéb eszközök monitorozására. A kapcsolat API kulcson keresztül történik.

### BlueIris kamerarendszer

A biztonsági kamerarendszer a BlueIris szoftverrel integrálódik, amely lehetővé teszi a kamerák élő képének megtekintését és vezérlését.

### TrackGPS flottakövetés

A járművek nyomon követése a TrackGPS rendszeren keresztül történik, amely valós idejű helyzet információkat biztosít.

## Licenc

Ez a projekt [MIT licenc](LICENSE) alatt áll.

## Kapcsolat

Kérdések vagy problémák esetén keress minket a [support@szemesipekseg.hu](mailto:support@szemesipekseg.hu) címen.