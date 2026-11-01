-- Datos semilla de oficios y micro-emprendimientos reales en barrios populares de Cali
-- ConectaComuna · Perfiles con fotos, oficios, servicios y coordenadas en Comuna 8, 12, 13, 15

DO $$
DECLARE
  v_pass text := '$2a$10$YjtybKLJQZ3MJBQf8gzQwezmHg9j.spWhKh7Hc1Rm6ebpc/aDYCAS';
  v_default_hours jsonb := '[
    {"day": 0, "opens": null, "closes": null, "closed": true},
    {"day": 1, "opens": "07:30", "closes": "18:00", "closed": false},
    {"day": 2, "opens": "07:30", "closes": "18:00", "closed": false},
    {"day": 3, "opens": "07:30", "closes": "18:00", "closed": false},
    {"day": 4, "opens": "07:30", "closes": "18:00", "closed": false},
    {"day": 5, "opens": "07:30", "closes": "18:00", "closed": false},
    {"day": 6, "opens": "08:00", "closes": "16:00", "closed": false}
  ]'::jsonb;
  v_food_hours jsonb := '[
    {"day": 0, "opens": "06:30", "closes": "20:00", "closed": false},
    {"day": 1, "opens": "06:30", "closes": "20:00", "closed": false},
    {"day": 2, "opens": "06:30", "closes": "20:00", "closed": false},
    {"day": 3, "opens": "06:30", "closes": "20:00", "closed": false},
    {"day": 4, "opens": "06:30", "closes": "21:00", "closed": false},
    {"day": 5, "opens": "06:30", "closes": "21:00", "closed": false},
    {"day": 6, "opens": "06:30", "closes": "21:00", "closed": false}
  ]'::jsonb;
BEGIN

  -- 1. Panadería y Pastelería La Espiga Dorada
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00001-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'panaderia.espiga@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Gonzalo Muñoz","phone":"3164448822","neighborhood":"El Rodeo","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00001-0000-4000-8000-000000000001', 'Gonzalo Muñoz', '3164448822', 'El Rodeo', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, wholesale_min_order, wholesale_terms, services_catalog)
  VALUES (
    'b1a00001-0000-4000-8000-000000000001',
    'f1a00001-0000-4000-8000-000000000001',
    'Panadería y Pastelería La Espiga Dorada',
    'Pan caliente todo el día, pandebonos tradicionales vallunos, buñuelos crocantes y tortas caseras para cumpleaños. Hacemos refrigerios para eventos y reuniones del sector.',
    'comida',
    '3164448822',
    '3164448822',
    'Carrera 38 # 45-19',
    'El Rodeo',
    3.4348,
    -76.5189,
    ARRAY[
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=60',
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=60',
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&q=60'
    ],
    v_food_hours,
    4.9, 18, 42, 'unverified', true, true,
    '20 unidades surtidas',
    'Descuento del 15% para cafeterías, tiendas y refrigerios de reuniones comunales.',
    '[
      {"id":"srv-espiga-1","name":"Bolsa de pandebonos calientes (x6)","price":12000,"description":"Recién horneados con queso costeño y almidón de yuca"},
      {"id":"srv-espiga-2","name":"Torta casera tres leches (media libra)","price":35000,"description":"Elaborada bajo pedido con decoración artesanal"},
      {"id":"srv-espiga-3","name":"Combo refrigerio comunal (pan dulce + avena casera)","price":6000,"description":"Ideal para talleres, reuniones y eventos barriales"},
      {"id":"srv-espiga-4","name":"Pan aliñado tradicional de la casa","price":5000,"description":"Pan suave con queso y mantequilla"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Taller de Motos El Paisa
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00002-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'motos.elpaisa@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Hernán Darío Gómez","phone":"3127789012","neighborhood":"Nueva Floresta","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00002-0000-4000-8000-000000000002', 'Hernán Darío Gómez', '3127789012', 'Nueva Floresta', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00002-0000-4000-8000-000000000002',
    'f1a00002-0000-4000-8000-000000000002',
    'Taller de Motos El Paisa',
    'Mantenimiento preventivo, frenos, sincronización, cambio de aceite y sistema eléctrico para motos de 100cc a 250cc. Despinche y servicio de varada en el barrio.',
    'otros',
    '3127789012',
    '3127789012',
    'Calle 50 # 39-14',
    'Nueva Floresta',
    3.4392,
    -76.5285,
    ARRAY[
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&q=60',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&q=60'
    ],
    v_default_hours,
    4.8, 31, 74, 'unverified', true, false,
    '[
      {"id":"srv-motos-1","name":"Cambio de aceite + engrase general","price":22000,"description":"Incluye revisión de cadena, frenos y presión de aire"},
      {"id":"srv-motos-2","name":"Sincronización y limpieza de carburador","price":38000,"description":"Limpieza de chicleres, bujía y filtro de aire"},
      {"id":"srv-motos-3","name":"Cambio de pastillas de freno","price":18000,"description":"Instalación y purga básica"},
      {"id":"srv-motos-4","name":"Despinche y parche vulcanizado","price":10000,"description":"Atención rápida en taller o sector aledaño"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Plomería y Gas Don Hernando
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00003-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'plomeria.hernando@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Hernando Patiño","phone":"3185552399","neighborhood":"Antonio Nariño","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00003-0000-4000-8000-000000000003', 'Hernando Patiño', '3185552399', 'Antonio Nariño', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00003-0000-4000-8000-000000000003',
    'f1a00003-0000-4000-8000-000000000003',
    'Plomería y Gas Don Hernando',
    'Detección y reparación de fugas de agua, destape de bajantes y cañerías con sonda eléctrica, instalación de griferías, sanitarios y acometidas de gas domiciliario con prueba de hermeticidad.',
    'construccion',
    '3185552399',
    '3185552399',
    'Carrera 41 # 39-25',
    'Antonio Nariño',
    3.4365,
    -76.5218,
    ARRAY[
      'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=600&q=60',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=60'
    ],
    v_default_hours,
    5.0, 14, 39, 'unverified', true, false,
    '[
      {"id":"srv-plom-1","name":"Destape de cañería o sifón con sonda","price":45000,"description":"Trabajo garantizado sin romper baldosas"},
      {"id":"srv-plom-2","name":"Reparación de fuga en tubería PVC","price":35000,"description":"Corte, unión y prueba de presión"},
      {"id":"srv-plom-3","name":"Instalación de grifería de lavamanos o lavaplatos","price":40000,"description":"Montaje limpio y ajuste de acoples flexibles"},
      {"id":"srv-plom-4","name":"Mantenimiento de calentador de agua a gas","price":60000,"description":"Limpieza de quemadores y revisión de diafragma"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 4. Empanadas y Fritos La Mona
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00004-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'fritos.lamona@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Yolanda Carabalí","phone":"3156671234","neighborhood":"El Retiro","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00004-0000-4000-8000-000000000004', 'Yolanda Carabalí', '3156671234', 'El Retiro', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, wholesale_min_order, wholesale_terms, services_catalog)
  VALUES (
    'b1a00004-0000-4000-8000-000000000004',
    'f1a00004-0000-4000-8000-000000000004',
    'Empanadas y Fritos La Mona',
    'Empanadas vallunas de carne desmechada con papa amarilla, marranitas crocantes de plátano verde, aborrajados con queso costeño y champús caleño bien helado. Fritura limpia en aceite nuevo todos los días.',
    'ambulante',
    '3156671234',
    '3156671234',
    'Calle 46B # 43A-08',
    'El Retiro',
    3.4312,
    -76.5165,
    ARRAY[
      'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&q=60',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=60',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=60'
    ],
    v_food_hours,
    4.9, 45, 112, 'unverified', true, true,
    '30 pasabocas congelados o fritos',
    'Pedidos para reuniones familiares, novenas y bazares con 24 horas de anticipación.',
    '[
      {"id":"srv-mona-1","name":"Docena de empanaditas vallunas con ají casero","price":18000,"description":"Crocantes, masa de maíz trillado y relleno sazonado"},
      {"id":"srv-mona-2","name":"Marranita tradicional grande","price":6000,"description":"Plátano verde relleno de chicharrón carnudo"},
      {"id":"srv-mona-3","name":"Aborrajado con queso y dulce de guayaba","price":5500,"description":"Plátano maduro rebozado y frito al punto"},
      {"id":"srv-mona-4","name":"Vaso de champús caleño de 12 oz","price":6000,"description":"Maíz, piña, lulo, hojas de naranjo y panela"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 5. Pinturas y Fachadas J.M.
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00005-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'pinturas.jm@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"José Manuel Rentería","phone":"3178893456","neighborhood":"El Vallado","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00005-0000-4000-8000-000000000005', 'José Manuel Rentería', '3178893456', 'El Vallado', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00005-0000-4000-8000-000000000005',
    'f1a00005-0000-4000-8000-000000000005',
    'Pinturas y Fachadas J.M.',
    'Pintura de fachadas, interiores, estuco veneciano, resane de humedades e impermeabilización de terrazas. Trabajo limpio, rápido y con garantía de cubrimiento.',
    'construccion',
    '3178893456',
    '3178893456',
    'Carrera 41B # 52-30',
    'El Vallado',
    3.4285,
    -76.5140,
    ARRAY[
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&q=60',
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=60'
    ],
    v_default_hours,
    4.7, 11, 28, 'unverified', true, false,
    '[
      {"id":"srv-pint-1","name":"Pintura de habitación estándar (mano de obra)","price":90000,"description":"Dos manos de pintura con encintado y protección de pisos"},
      {"id":"srv-pint-2","name":"Resane y estuco por metro cuadrado","price":14000,"description":"Nivelación de muros y lijado al ras"},
      {"id":"srv-pint-3","name":"Impermeabilización de terraza (por m²)","price":25000,"description":"Manto asfáltico o pintura impermeabilizante con fibra"},
      {"id":"srv-pint-4","name":"Pintura de fachada de 2 pisos (mano de obra)","price":260000,"description":"Incluye preparación de superficie y andamiaje básico"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 6. Electricidad y Redes Don William
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00006-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'electricos.william@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"William Caicedo","phone":"3134449811","neighborhood":"La Floresta","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00006-0000-4000-8000-000000000006', 'William Caicedo', '3134449811', 'La Floresta', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00006-0000-4000-8000-000000000006',
    'f1a00006-0000-4000-8000-000000000006',
    'Electricidad y Redes Don William',
    'Técnico electricista certificado. Instalación de breakes, tomas corrientes de 110v y 220v, ventiladores de techo, lámparas LED y arreglo de cortos circuitos urgentes en viviendas y locales.',
    'otros',
    '3134449811',
    '3134449811',
    'Calle 33A # 36-40',
    'La Floresta',
    3.4435,
    -76.5250,
    ARRAY[
      'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=60'
    ],
    v_default_hours,
    4.9, 19, 48, 'unverified', true, false,
    '[
      {"id":"srv-elec-1","name":"Revisión y arreglo de corto circuito residencial","price":50000,"description":"Diagnóstico de falla y aislamiento seguro"},
      {"id":"srv-elec-2","name":"Instalación de ventilador de techo o lámpara","price":35000,"description":"Fijación reforzada y conexión probada"},
      {"id":"srv-elec-3","name":"Cambio de tablero o instalación de breakers","price":80000,"description":"Adecuación de carga y rotulado de circuitos"},
      {"id":"srv-elec-4","name":"Punto nuevo de energía (toma o interruptor)","price":30000,"description":"Mano de obra con tubería sobrepuesta o ranurada"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 7. Almuerzos Caseros Doña Cielo
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00007-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'almuerzos.cielo@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Cielo María Valencia","phone":"3117765544","neighborhood":"Antonio Nariño","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00007-0000-4000-8000-000000000007', 'Cielo María Valencia', '3117765544', 'Antonio Nariño', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, wholesale_min_order, wholesale_terms, services_catalog)
  VALUES (
    'b1a00007-0000-4000-8000-000000000007',
    'f1a00007-0000-4000-8000-000000000007',
    'Almuerzos Caseros Doña Cielo',
    'Almuerzo casero ejecutivo y corriente con sazón de hogar: sopa caliente, seco con proteína a elegir (pechuga, carne asada, cerdo o pescado), ensalada fresca, principio y jugo natural de fruta.',
    'comida',
    '3117765544',
    '3117765544',
    'Carrera 40 # 41-15',
    'Antonio Nariño',
    3.4378,
    -76.5230,
    ARRAY[
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=60',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=60',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=60'
    ],
    v_food_hours,
    4.8, 29, 87, 'unverified', true, true,
    '10 almuerzos para talleres o empresas',
    'Tarifa especial con $1.500 de descuento por plato a partir de 10 unidades diarias.',
    '[
      {"id":"srv-cielo-1","name":"Almuerzo casero del día (completo)","price":15000,"description":"Sopa, seco, principio, ensalada y jugo natural"},
      {"id":"srv-cielo-2","name":"Sancocho valluno especial de gallina","price":22000,"description":"Preparado en leña los sábados y domingos"},
      {"id":"srv-cielo-3","name":"Jarra de jugo natural (1 litro)","price":9000,"description":"Lulo, maracuyá, mango o mora en agua o leche"},
      {"id":"srv-cielo-4","name":"Porción de frijolada con chicharrón crocante","price":18000,"description":"Con arroz, tajada de plátano maduro y aguacate"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 8. Calzado y Remiendos Don Beto
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00008-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'calzado.beto@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alberto Rosero","phone":"3146654321","neighborhood":"Nueva Floresta","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00008-0000-4000-8000-000000000008', 'Alberto Rosero', '3146654321', 'Nueva Floresta', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00008-0000-4000-8000-000000000008',
    'f1a00008-0000-4000-8000-000000000008',
    'Calzado y Remiendos Don Beto',
    'Remiendo y restauración de calzado de toda clase. Cosido de tenis y botas a mano o máquina, cambio de tapas y suelas de caucho, pegado vulcanizado y ajuste de maletines y bolsos de cuero.',
    'otros',
    '3146654321',
    '3146654321',
    'Calle 53 # 41-05',
    'Nueva Floresta',
    3.4420,
    -76.5275,
    ARRAY[
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=60',
      'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=600&q=60'
    ],
    v_default_hours,
    4.9, 22, 56, 'unverified', true, false,
    '[
      {"id":"srv-beto-1","name":"Cosido completo de suela en par de tenis","price":16000,"description":"Costura perimetral con hilo encerado de alta resistencia"},
      {"id":"srv-beto-2","name":"Cambio de tapas de tacón de mujer","price":12000,"description":"Colocación de tapitas de poliuretano antideslizante"},
      {"id":"srv-beto-3","name":"Pegado y prensado vulcanizado","price":10000,"description":"Adhesivo especial para calzado y secado térmico"},
      {"id":"srv-beto-4","name":"Cambio de suela completa en bota de trabajo","price":45000,"description":"Suela de caucho resistente a trabajo pesado"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 9. Lavado y Tapicería Express
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00009-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'tapiceria.express@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Brayan Stiven Mina","phone":"3192233445","neighborhood":"El Rodeo","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00009-0000-4000-8000-000000000009', 'Brayan Stiven Mina', '3192233445', 'El Rodeo', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00009-0000-4000-8000-000000000009',
    'f1a00009-0000-4000-8000-000000000009',
    'Lavado y Tapicería Express',
    'Lavado profundo a vapor e inyección-extracción para salas, comedores, colchones y cojinería de autos. Eliminación de manchas de grasa, ácaros y malos olores con productos biodegradables a domicilio.',
    'otros',
    '3192233445',
    '3192233445',
    'Carrera 37A # 48-12',
    'El Rodeo',
    3.4335,
    -76.5205,
    ARRAY[
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=60'
    ],
    v_default_hours,
    4.8, 17, 34, 'unverified', true, false,
    '[
      {"id":"srv-tap-1","name":"Lavado profundo de juego de sala (3 piezas)","price":95000,"description":"Limpieza a vapor y secado rápido antiácaros"},
      {"id":"srv-tap-2","name":"Lavado y desinfección de colchón doble cara","price":75000,"description":"Eliminación de manchas superficiales y bacterias"},
      {"id":"srv-tap-3","name":"Lavado de sillas de comedor (por puesto)","price":12000,"description":"Shampoo textil y desmanchado de tela"},
      {"id":"srv-tap-4","name":"Limpieza de cojinería de vehículo particular","price":85000,"description":"Asientos delanteros, traseros y tapetes"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 10. Taller de Ciclismo y Bicis La Comuna
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00010-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'bicis.lacomuna@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Julián Arboleda","phone":"3108899776","neighborhood":"El Vallado","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00010-0000-4000-8000-000000000010', 'Julián Arboleda', '3108899776', 'El Vallado', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00010-0000-4000-8000-000000000010',
    'f1a00010-0000-4000-8000-000000000010',
    'Taller de Ciclismo y Bicis La Comuna',
    'Mantenimiento preventivo y general de bicicletas de montaña, ruta y urbanas. Centrado de rines, purgado de frenos hidráulicos, cambio de guayas, coronas y repuestos originales en el sector.',
    'otros',
    '3108899776',
    '3108899776',
    'Calle 51 # 42-18',
    'El Vallado',
    3.4290,
    -76.5152,
    ARRAY[
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=60',
      'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600&q=60'
    ],
    v_default_hours,
    4.9, 25, 63, 'unverified', true, false,
    '[
      {"id":"srv-bici-1","name":"Mantenimiento general (desarme y engrase)","price":45000,"description":"Lavado a fondo, engrase de manzanas, caja y dirección"},
      {"id":"srv-bici-2","name":"Centrado de rin delantero o trasero","price":14000,"description":"Ajuste y tensión de radios con comparador"},
      {"id":"srv-bici-3","name":"Cambio de guayas y fundas de cambios/frenos","price":18000,"description":"Incluye guayas de acero y calibración"},
      {"id":"srv-bici-4","name":"Purgado y cambio de líquido hidráulico","price":30000,"description":"Para frenos Shimano, Tektro o similares"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 11. Estética y Peluquería Canina Huellitas
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00011-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'canina.huellitas@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Paola Andrea Hurtado","phone":"3189901122","neighborhood":"Antonio Nariño","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00011-0000-4000-8000-000000000011', 'Paola Andrea Hurtado', '3189901122', 'Antonio Nariño', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00011-0000-4000-8000-000000000011',
    'f1a00011-0000-4000-8000-000000000011',
    'Estética y Peluquería Canina Huellitas',
    'Baño medicado y antipulgas, corte de pelo según raza, limpieza de oídos, corte de uñas y cepillado dental para perros y gatos. Trato amoroso y sin sedantes en local o a domicilio.',
    'otros',
    '3189901122',
    '3189901122',
    'Calle 42 # 40A-22',
    'Antonio Nariño',
    3.4370,
    -76.5210,
    ARRAY[
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600&q=60',
      'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=600&q=60'
    ],
    v_default_hours,
    5.0, 33, 78, 'unverified', true, false,
    '[
      {"id":"srv-can-1","name":"Baño básico + corte de uñas (raza pequeña)","price":28000,"description":"Shampoo suave, secado con toalla térmica y perfumado"},
      {"id":"srv-can-2","name":"Combo baño + corte de pelo estilizado","price":45000,"description":"Corte de pelo a tijera o máquina según raza"},
      {"id":"srv-can-3","name":"Baño medicado antipulgas y garrapatas","price":35000,"description":"Tratamiento dermatológico con repelente seguro"},
      {"id":"srv-can-4","name":"Corte higiénico y limpieza de oídos","price":15000,"description":"Limpieza de canal auditivo y despeje de patitas"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 12. Mandados y Mensajería Rápida El Vecino
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00012-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'mandados.elvecino@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Cristian Camilo Murillo","phone":"3173322110","neighborhood":"El Rodeo","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00012-0000-4000-8000-000000000012', 'Cristian Camilo Murillo', '3173322110', 'El Rodeo', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, wholesale_min_order, wholesale_terms, services_catalog)
  VALUES (
    'b1a00012-0000-4000-8000-000000000012',
    'f1a00012-0000-4000-8000-000000000012',
    'Mandados y Mensajería Rápida El Vecino',
    'Mensajería de confianza de vecino a vecino. Compras en la galería o supermercado, reclamo de medicamentos en EPS, pago de servicios públicos y envíos urgentes de paquetes en toda la comuna.',
    'domicilios',
    '3173322110',
    '3173322110',
    'Calle 45 # 39-10',
    'El Rodeo',
    3.4340,
    -76.5195,
    ARRAY[
      'https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?w=600&q=60'
    ],
    v_default_hours,
    4.9, 40, 140, 'unverified', true, true,
    'Plan mensual de 20 carreras para talleres o tiendas',
    'Tarifa fija de $4.500 por carrera corta dentro del perímetro comunal.',
    '[
      {"id":"srv-mand-1","name":"Carrera de mandado corto dentro del barrio","price":5000,"description":"Recogida y entrega rápida en menos de 30 minutos"},
      {"id":"srv-mand-2","name":"Fila y pago de recibos en corresponsal","price":8000,"description":"Comprobante fotografiado al instante por WhatsApp"},
      {"id":"srv-mand-3","name":"Reclamo de fórmulas médicas en EPS","price":10000,"description":"Gestión de turno y entrega en la puerta de la casa"},
      {"id":"srv-mand-4","name":"Compra y entrega de víveres en galería local","price":12000,"description":"Selección de frutas, verduras y carnes frescas"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 13. Vivero y Plantas Tierra Verde
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00013-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'vivero.tierraverde@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Mercedes Caicedo","phone":"3168877112","neighborhood":"Nueva Floresta","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00013-0000-4000-8000-000000000013', 'Mercedes Caicedo', '3168877112', 'Nueva Floresta', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, wholesale_min_order, wholesale_terms, services_catalog)
  VALUES (
    'b1a00013-0000-4000-8000-000000000013',
    'f1a00013-0000-4000-8000-000000000013',
    'Vivero y Plantas Tierra Verde',
    'Plantas ornamentales de sombra y sol para el hogar, plantas aromáticas y medicinales, tierra abonada, cascarilla, abonos orgánicos y materas decorativas de barro y plástico hechas por artesanos.',
    'otros',
    '3168877112',
    '3168877112',
    'Carrera 42 # 51-12',
    'Nueva Floresta',
    3.4410,
    -76.5260,
    ARRAY[
      'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&q=60'
    ],
    v_default_hours,
    5.0, 16, 35, 'unverified', true, true,
    '12 plantas surtidas o 5 bultos de tierra',
    'Precios al por mayor para jardines comunitarios, colegios y conjuntos.',
    '[
      {"id":"srv-viv-1","name":"Matera con planta de sombra decorativa","price":18000,"description":"Planta sana sembrada en matera plástica decorativa"},
      {"id":"srv-viv-2","name":"Bolsa de tierra abonada y tamizada (5 kg)","price":7000,"description":"Tierra negra enriquecida con humus de lombriz"},
      {"id":"srv-viv-3","name":"Kit de aromáticas para cocina (3 plantas)","price":22000,"description":"Albahaca, menta y romero listas para podar"},
      {"id":"srv-viv-4","name":"Mantenimiento y poda de jardín residencial","price":40000,"description":"Limpieza de maleza, abono y corte de bordes"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 14. Barbería y Peluquería Afro-Stylo
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00014-0000-4000-8000-000000000014', 'authenticated', 'authenticated', 'barberia.afrostylo@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Jhon Edison Balanta","phone":"3147788990","neighborhood":"El Retiro","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00014-0000-4000-8000-000000000014', 'Jhon Edison Balanta', '3147788990', 'El Retiro', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, services_catalog)
  VALUES (
    'b1a00014-0000-4000-8000-000000000014',
    'f1a00014-0000-4000-8000-000000000014',
    'Barbería y Peluquería Afro-Stylo',
    'Especialistas en degradados modernos, sombras, líneas, figuras y perfilado de barba con toalla caliente. Aplicación de tinte negro, mascarillas faciales y ambiente musical agradable.',
    'belleza',
    '3147788990',
    '3147788990',
    'Carrera 44 # 47-30',
    'El Retiro',
    3.4320,
    -76.5170,
    ARRAY[
      'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=600&q=60',
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=60'
    ],
    v_default_hours,
    4.9, 37, 95, 'unverified', true, false,
    '[
      {"id":"srv-afro-1","name":"Corte urbano degradado (fade)","price":15000,"description":"Corte a máquina y tijera con navaja desechable"},
      {"id":"srv-afro-2","name":"Arreglo y perfilado de barba con navaja","price":10000,"description":"Toalla caliente, aceite de afeitar y aftershave"},
      {"id":"srv-afro-3","name":"Combo Corte + Barba + Mascarilla negra","price":25000,"description":"Servicio completo de cuidado masculino"},
      {"id":"srv-afro-4","name":"Pigmentación de barba o cejas","price":12000,"description":"Tinte semipermanente para acabado definido"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- 15. Insumos y Químicos de Aseo La Comuna
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', 'f1a00015-0000-4000-8000-000000000015', 'authenticated', 'authenticated', 'aseo.lacomuna@conectacomuna.co', v_pass, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sandra Patricia Quiñones","phone":"3113339900","neighborhood":"El Rodeo","account_type":"business","onboarding_completado":true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, phone, neighborhood, account_type, onboarding_completado)
  VALUES ('f1a00015-0000-4000-8000-000000000015', 'Sandra Patricia Quiñones', '3113339900', 'El Rodeo', 'business', true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, neighborhood = EXCLUDED.neighborhood;

  INSERT INTO public.businesses (id, owner_id, name, description, category, phone, whatsapp, address, neighborhood, lat, lng, photos, hours, rating_avg, rating_count, completed_orders, verification_status, is_active, wholesale_enabled, wholesale_min_order, wholesale_terms, services_catalog)
  VALUES (
    'b1a00015-0000-4000-8000-000000000015',
    'f1a00015-0000-4000-8000-000000000015',
    'Insumos y Químicos de Aseo La Comuna',
    'Fabricación y distribución de productos de aseo de alto rendimiento: límpido clorado concentrado, ambientadores con aromas frutales, jabón líquido para loza, cera emulsionada y desengrasante industrial.',
    'otros',
    '3113339900',
    '3113339900',
    'Calle 49 # 38-28',
    'El Rodeo',
    3.4355,
    -76.5200,
    ARRAY[
      'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&q=60'
    ],
    v_default_hours,
    4.8, 19, 52, 'unverified', true, true,
    'Galón o pimpina de 5 galones',
    'Precios directos de fábrica para restaurantes, talleres y colegios.',
    '[
      {"id":"srv-aseo-1","name":"Galón de límpido concentrado al 6%","price":9000,"description":"Desinfectante clorado de alta pureza"},
      {"id":"srv-aseo-2","name":"Galón de jabón lavaplatos desengrasante","price":16000,"description":"Fórmula densa con aroma a limón"},
      {"id":"srv-aseo-3","name":"Galón de ambientador concentrado fragancia lavanda","price":14000,"description":"Aroma duradero para pisos y superficies"},
      {"id":"srv-aseo-4","name":"Kit ahorro aseo hogar (3 galones surtidos)","price":35000,"description":"Límpido + Lavaplatos + Ambientador con entrega en el barrio"}
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

END $$;
