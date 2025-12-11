INSERT INTO products (id, nama_produk, tipe_produk, serial_number, merk_produk, created_at, updated_at)
VALUES (1, 'D3',  'patient monitor', '1123', 'Beneheart', NOW(), NOW());

INSERT INTO products (id, nama_produk, tipe_produk, serial_number, merk_produk, created_at, updated_at)
VALUES (2, 'Syringe Pump', 'life support' , 'SK Medical', '2245' , NOW(), NOW());

-- Source - https://stackoverflow.com/a
-- Posted by Oded, modified by community. See post 'Timeline' for change history
-- Retrieved 2025-11-12, License - CC BY-SA 3.0

INSERT INTO products (id, nama_produk, tipe_produk, serial_number, merk_produk, created_at, updated_at)
VALUES (3, 'Hypervisor', 'software patient monitor' , 'Mindray' , '3289', NOW(), NOW());

form state snapshot: {"Capa": "Lakukan inspeksi tiap 3 bulan ", "deskMas": "Tidak menyala saat tombol on ditekan ", "estimasi": "Selesai dalam 2 jam ", "koreksi": "mengencangkan konektor dan membersihkan komponen ", "kuantitas": "1", "lokasi": {"label": "Rumah Sakit Siloam", "value": "1"}, "masalah": "Kabel internal longgar ", "merkProd": "Lifesense Medical ", "namaCust": "Dr Sinta Melani ", "prodName": "Patient Monitor Multi Parameter ", "productType": "MP-7600", "tgl": "2025-11-18"}


-- adjust file path to where the CSV is on the machine you run the client from
TRUNCATE TABLE hospitals;

LOAD DATA LOCAL INFILE '/Users/jasonsutanto/Documents/cleaned_hospitals_final_3.csv'
INTO TABLE hospitals
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@No, @Nama_RS, @ALAMAT, @Koordinat, @AlamatDiMaps, @Lat, @Lng, @Street, @region)
SET
  region    = NULLIF(TRIM(REPLACE(REPLACE(@region, CHAR(0xC2,0xA0), ' '), CHAR(0xE2,0x80,0x8B), '')),''),
  name      = NULLIF(TRIM(@Nama_RS),''),
  street    = NULLIF(TRIM(@Street),''),
  latitude  = NULLIF(@Lat,''),
  longitude = NULLIF(@Lng,'');



LOAD DATA LOCAL INFILE '/Users/jasonsutanto/Documents/cleaned_hospitals_final_3.csv'
INTO TABLE hospitals
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@No, @Nama_RS, @ALAMAT, @Koordinat, @AlamatDiMaps, @Lat, @Lng, @Street, @region)
SET
  region    = NULLIF(TRIM(@region), ''),
  name      = NULLIF(TRIM(@Nama_RS),''),
  street    = NULLIF(TRIM(@Street),''),
  latitude  = NULLIF(@Lat,''),
  longitude = NULLIF(@Lng,'');


  -- connect with --local-infile=1
LOAD DATA LOCAL INFILE '/Users/jasonsutanto/Documents/cleaned_hospitals_final_3.csv'
INTO TABLE hospitals
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ';'     -- <- semicolon!
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'   -- <- CRLF as in your file
IGNORE 1 LINES
(@No, @Nama_RS, @ALAMAT, @Koordinat, @AlamatDiMaps, @Lat, @Lng, @Street, @region)
SET
  region    = NULLIF(TRIM(@region), ''),
  name      = NULLIF(TRIM(@Nama_RS),''),
  street    = NULLIF(TRIM(@Street),''),
  latitude  = NULLIF(@Lat,''),
  longitude = NULLIF(@Lng,'');


