SET NAMES utf8mb4;

INSERT INTO locations (name)
SELECT 'La Terraza Azul'
WHERE NOT EXISTS (
  SELECT 1 FROM locations WHERE name = 'La Terraza Azul'
);

INSERT INTO locations (name)
SELECT 'Cuatro Vientos'
WHERE NOT EXISTS (
  SELECT 1 FROM locations WHERE name = 'Cuatro Vientos'
);

INSERT INTO locations (name)
SELECT 'Casa Mediterránea'
WHERE NOT EXISTS (
  SELECT 1 FROM locations WHERE name = 'Casa Mediterránea'
);
