-- Activer la gestion des clés étrangères
PRAGMA foreign_keys = ON;

-- 1. Table des types de capteur, avec unité de mesure optionnelle
CREATE TABLE sensor_type (
    id   INTEGER PRIMARY KEY,       -- identifiant unique auto‑incrémenté
    name TEXT    NOT NULL UNIQUE,   -- 'température', 'humidité', etc.
    unit TEXT                       -- unité de mesure (°C, %RH, lux…), facultatif
);

-- 2. Table des lieux
CREATE TABLE location (
    id   INTEGER PRIMARY KEY,
    name TEXT    NOT NULL UNIQUE    -- 'Atelier', 'Extérieur Nord', etc.
);

-- 3. Table des capteurs, avec numéro de série optionnel
CREATE TABLE sensor (
    id             INTEGER PRIMARY KEY,
    name           TEXT    NOT NULL,     -- nom lisible du capteur
    type_id        INTEGER NOT NULL,     -- réf. vers sensor_type(id)
    location_id    INTEGER NOT NULL,     -- réf. vers location(id)
    serial_number  TEXT,                 -- numéro de série, facultatif
    FOREIGN KEY(type_id)     REFERENCES sensor_type(id)
                              ON UPDATE CASCADE
                              ON DELETE RESTRICT,
    FOREIGN KEY(location_id) REFERENCES location(id)
                              ON UPDATE CASCADE
                              ON DELETE RESTRICT
);

-- 4. Table des relevés (valeurs) avec NUMERIC pour valeur décimale exacte
CREATE TABLE reading (
    id         INTEGER   PRIMARY KEY,
    sensor_id  INTEGER   NOT NULL,           -- réf. vers sensor(id)
    timestamp  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    value      NUMERIC  NOT NULL,            -- valeur décimale (p.ex. 23.45)
    FOREIGN KEY(sensor_id) REFERENCES sensor(id)
                              ON UPDATE CASCADE
                              ON DELETE CASCADE
);

-- Index pour accélérer les requêtes historiques par capteur et date
CREATE INDEX idx_reading_sensor_ts
    ON reading(sensor_id, timestamp);
