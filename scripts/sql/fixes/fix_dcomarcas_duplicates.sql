-- FIX: Remove duplicatas da tabela dcomarcas
-- Mantém apenas o registro com menor idcomarca para cada comarca

-- Passo 1: Verificar duplicatas
SELECT comarca, COUNT(*) as qtd 
FROM dcomarcas 
GROUP BY comarca 
HAVING COUNT(*) > 1
ORDER BY comarca
LIMIT 10;

-- Passo 2: Deletar duplicatas (mantém menor ID)
DELETE FROM dcomarcas 
WHERE idcomarca NOT IN (
    SELECT MIN(idcomarca) 
    FROM dcomarcas 
    GROUP BY comarca
);

-- Passo 3: Verificar resultado
SELECT COUNT(*) as total_restante FROM dcomarcas;

-- Passo 4: Popular coordenadas (usando TRIM e case-insensitive para evitar problemas de encoding)
UPDATE dcomarcas SET latitude = CASE TRIM(comarca)
    WHEN 'Abaetetuba' THEN -1.7218
    WHEN 'Abel Figueiredo' THEN -4.9531
    WHEN 'Acará' THEN -1.9608
    WHEN 'Afuá' THEN -0.1544
    WHEN 'Água Azul do Norte' THEN -6.7908
    WHEN 'Alenquer' THEN -1.9425
    WHEN 'Almeirim' THEN -1.5283
    WHEN 'Altamira' THEN -3.2033
    WHEN 'Anajás' THEN -0.9869
    WHEN 'Ananindeua' THEN -1.3636
    WHEN 'Anapu' THEN -3.4719
    WHEN 'Augusto Corrêa' THEN -1.0225
    WHEN 'Aurora do Pará' THEN -2.1500
    WHEN 'Aveiro' THEN -3.6083
    WHEN 'Bagre' THEN -1.9003
    WHEN 'Baião' THEN -2.7903
    WHEN 'Bannach' THEN -7.3486
    WHEN 'Barcarena' THEN -1.5058
    WHEN 'Belém' THEN -1.4557
    WHEN 'Belterra' THEN -2.6364
    WHEN 'Benevides' THEN -1.3619
    WHEN 'Bom Jesus do Tocantins' THEN -5.0833
    WHEN 'Bonito' THEN -1.3651
    WHEN 'Bragança' THEN -1.0536
    WHEN 'Brasil Novo' THEN -3.3000
    WHEN 'Brejo Grande do Araguaia' THEN -5.6981
    WHEN 'Breu Branco' THEN -3.7731
    WHEN 'Breves' THEN -1.6818
    WHEN 'Bujaru' THEN -1.5158
    WHEN 'Cachoeira do Arari' THEN -1.0147
    WHEN 'Cachoeira do Piriá' THEN -1.7603
    WHEN 'Cametá' THEN -2.2422
    WHEN 'Canaã dos Carajás' THEN -6.4306
    WHEN 'Capanema' THEN -1.1969
    WHEN 'Capitão Poço' THEN -1.7458
    WHEN 'Castanhal' THEN -1.2968
    WHEN 'Chaves' THEN -0.1653
    WHEN 'Colares' THEN -0.9364
    WHEN 'Conceição do Araguaia' THEN -8.2589
    WHEN 'Concórdia do Pará' THEN -2.0025
    WHEN 'Curionópolis' THEN -6.1006
    WHEN 'Curralinho' THEN -1.8108
    WHEN 'Curuá' THEN -1.8833
    WHEN 'Curuçá' THEN -0.7336
    WHEN 'Dom Eliseu' THEN -4.2833
    WHEN 'Eldorado dos Carajás' THEN -6.1028
    WHEN 'Faro' THEN -2.1694
    WHEN 'Floresta do Araguaia' THEN -7.5567
    WHEN 'Garrafão do Norte' THEN -1.9292
    WHEN 'Goianésia do Pará' THEN -3.8381
    WHEN 'Gurupá' THEN -1.4083
    WHEN 'Igarapé-Açu' THEN -1.1278
    WHEN 'Igarapé-Miri' THEN -1.9750
    WHEN 'Inhangapi' THEN -1.4289
    WHEN 'Ipixuna do Pará' THEN -2.5575
    WHEN 'Irituia' THEN -1.7725
    WHEN 'Itaituba' THEN -4.2762
    WHEN 'Itupiranga' THEN -5.1336
    WHEN 'Jacareacanga' THEN -6.2167
    WHEN 'Jacundá' THEN -4.4489
    WHEN 'Juruti' THEN -2.1528
    WHEN 'Limoeiro do Ajuru' THEN -1.8989
    WHEN 'Mãe do Rio' THEN -2.0583
    WHEN 'Magalhães Barata' THEN -0.8019
    WHEN 'Marabá' THEN -5.3686
    WHEN 'Maracanã' THEN -0.7727
    WHEN 'Marapanim' THEN -0.7117
    WHEN 'Marituba' THEN -1.3556
    WHEN 'Medicilândia' THEN -3.4472
    WHEN 'Melgaço' THEN -1.8028
    WHEN 'Mocajuba' THEN -2.5844
    WHEN 'Moju' THEN -1.8844
    WHEN 'Monte Alegre' THEN -2.0075
    WHEN 'Muaná' THEN -1.5283
    WHEN 'Nova Esperança do Piriá' THEN -2.2731
    WHEN 'Nova Timboteua' THEN -1.2086
    WHEN 'Novo Progresso' THEN -7.1428
    WHEN 'Novo Repartimento' THEN -4.2478
    WHEN 'Óbidos' THEN -1.9022
    WHEN 'Oeiras do Pará' THEN -2.0053
    WHEN 'Oriximiná' THEN -1.7656
    WHEN 'Ourilândia do Norte' THEN -6.7533
    WHEN 'Ourém' THEN -1.5508
    WHEN 'Pacajá' THEN -3.8361
    WHEN 'Paragominas' THEN -2.9667
    WHEN 'Parauapebas' THEN -6.0676
    WHEN 'Peixe-Boi' THEN -1.1933
    WHEN 'Placas' THEN -3.8689
    WHEN 'Portel' THEN -1.9367
    WHEN 'Porto de Moz' THEN -1.7486
    WHEN 'Prainha' THEN -1.7983
    WHEN 'Primavera' THEN -0.9419
    WHEN 'Redenção' THEN -8.0267
    WHEN 'Rio Maria' THEN -7.3042
    WHEN 'Rondon do Pará' THEN -4.7775
    WHEN 'Rurópolis' THEN -4.1000
    WHEN 'Salinópolis' THEN -0.6133
    WHEN 'Salvaterra' THEN -0.7567
    WHEN 'Santa Bárbara' THEN -1.2242
    WHEN 'Santa Cruz do Arari' THEN -0.6600
    WHEN 'Santa Isabel do Pará' THEN -1.2986
    WHEN 'Santa Luzia do Pará' THEN -1.5233
    WHEN 'Santa Maria das Barreiras' THEN -8.8567
    WHEN 'Santa Maria do Pará' THEN -1.3531
    WHEN 'Santana do Araguaia' THEN -9.3281
    WHEN 'Santarém' THEN -2.4430
    WHEN 'Santarém Novo' THEN -0.9292
    WHEN 'Santo Antônio do Tauá' THEN -1.1533
    WHEN 'São Caetano de Odivelas' THEN -0.7494
    WHEN 'São Domingos do Araguaia' THEN -5.5381
    WHEN 'São Domingos do Capim' THEN -1.6861
    WHEN 'São Félix do Xingu' THEN -6.6447
    WHEN 'São Francisco do Pará' THEN -1.1700
    WHEN 'São Geraldo do Araguaia' THEN -6.3975
    WHEN 'São João de Pirabas' THEN -0.7733
    WHEN 'São João do Araguaia' THEN -5.3589
    WHEN 'São Miguel do Guamá' THEN -1.6272
    WHEN 'São Sebastião da Boa Vista' THEN -1.7175
    WHEN 'Sapucaia' THEN -6.9389
    WHEN 'Senador José Porfírio' THEN -2.5917
    WHEN 'Soure' THEN -0.7164
    WHEN 'Tailândia' THEN -2.9469
    WHEN 'Terra Alta' THEN -1.0278
    WHEN 'Terra Santa' THEN -2.1028
    WHEN 'Tomé-Açu' THEN -2.4178
    WHEN 'Tracuateua' THEN -1.0764
    WHEN 'Trairão' THEN -4.5733
    WHEN 'Tucumã' THEN -6.7500
    WHEN 'Tucuruí' THEN -3.7660
    WHEN 'Ulianópolis' THEN -3.7500
    WHEN 'Uruará' THEN -3.7161
    WHEN 'Vigia' THEN -0.8583
    WHEN 'Viseu' THEN -1.1964
    WHEN 'Vitória do Xingu' THEN -2.8833
    WHEN 'Xinguara' THEN -7.0983
    ELSE latitude
END,
longitude = CASE TRIM(comarca)
    WHEN 'Abaetetuba' THEN -48.8788
    WHEN 'Abel Figueiredo' THEN -49.0619
    WHEN 'Acará' THEN -48.1964
    WHEN 'Afuá' THEN -50.3858
    WHEN 'Água Azul do Norte' THEN -50.4808
    WHEN 'Alenquer' THEN -54.7383
    WHEN 'Almeirim' THEN -52.5822
    WHEN 'Altamira' THEN -52.2064
    WHEN 'Anajás' THEN -49.9386
    WHEN 'Ananindeua' THEN -48.3733
    WHEN 'Anapu' THEN -51.1819
    WHEN 'Augusto Corrêa' THEN -46.6369
    WHEN 'Aurora do Pará' THEN -47.5667
    WHEN 'Aveiro' THEN -55.3167
    WHEN 'Bagre' THEN -49.6233
    WHEN 'Baião' THEN -49.6703
    WHEN 'Bannach' THEN -50.3894
    WHEN 'Barcarena' THEN -48.6258
    WHEN 'Belém' THEN -48.4902
    WHEN 'Belterra' THEN -54.9364
    WHEN 'Benevides' THEN -48.2439
    WHEN 'Bom Jesus do Tocantins' THEN -48.6000
    WHEN 'Bonito' THEN -47.3075
    WHEN 'Bragança' THEN -46.7656
    WHEN 'Brasil Novo' THEN -52.5333
    WHEN 'Brejo Grande do Araguaia' THEN -48.4131
    WHEN 'Breu Branco' THEN -49.5658
    WHEN 'Breves' THEN -50.4796
    WHEN 'Bujaru' THEN -48.0417
    WHEN 'Cachoeira do Arari' THEN -48.9603
    WHEN 'Cachoeira do Piriá' THEN -46.5453
    WHEN 'Cametá' THEN -49.4950
    WHEN 'Canaã dos Carajás' THEN -49.8778
    WHEN 'Capanema' THEN -47.1812
    WHEN 'Capitão Poço' THEN -47.0833
    WHEN 'Castanhal' THEN -47.9234
    WHEN 'Chaves' THEN -49.9858
    WHEN 'Colares' THEN -48.2808
    WHEN 'Conceição do Araguaia' THEN -49.2647
    WHEN 'Concórdia do Pará' THEN -47.9425
    WHEN 'Curionópolis' THEN -49.6072
    WHEN 'Curralinho' THEN -49.7953
    WHEN 'Curuá' THEN -55.1167
    WHEN 'Curuçá' THEN -47.8536
    WHEN 'Dom Eliseu' THEN -47.8250
    WHEN 'Eldorado dos Carajás' THEN -49.3533
    WHEN 'Faro' THEN -56.7386
    WHEN 'Floresta do Araguaia' THEN -49.7139
    WHEN 'Garrafão do Norte' THEN -47.0514
    WHEN 'Goianésia do Pará' THEN -49.0975
    WHEN 'Gurupá' THEN -51.6350
    WHEN 'Igarapé-Açu' THEN -47.6200
    WHEN 'Igarapé-Miri' THEN -48.9578
    WHEN 'Inhangapi' THEN -47.9153
    WHEN 'Ipixuna do Pará' THEN -47.5019
    WHEN 'Irituia' THEN -47.4592
    WHEN 'Itaituba' THEN -55.9836
    WHEN 'Itupiranga' THEN -49.3278
    WHEN 'Jacareacanga' THEN -57.7525
    WHEN 'Jacundá' THEN -49.1156
    WHEN 'Juruti' THEN -56.0925
    WHEN 'Limoeiro do Ajuru' THEN -49.3897
    WHEN 'Mãe do Rio' THEN -47.5583
    WHEN 'Magalhães Barata' THEN -47.5983
    WHEN 'Marabá' THEN -49.1174
    WHEN 'Maracanã' THEN -47.4522
    WHEN 'Marapanim' THEN -47.7017
    WHEN 'Marituba' THEN -48.3411
    WHEN 'Medicilândia' THEN -52.8878
    WHEN 'Melgaço' THEN -50.7144
    WHEN 'Mocajuba' THEN -49.5050
    WHEN 'Moju' THEN -48.7686
    WHEN 'Monte Alegre' THEN -54.0683
    WHEN 'Muaná' THEN -49.2172
    WHEN 'Nova Esperança do Piriá' THEN -46.9731
    WHEN 'Nova Timboteua' THEN -47.3928
    WHEN 'Novo Progresso' THEN -55.3853
    WHEN 'Novo Repartimento' THEN -49.9478
    WHEN 'Óbidos' THEN -55.5178
    WHEN 'Oeiras do Pará' THEN -49.8597
    WHEN 'Oriximiná' THEN -55.8600
    WHEN 'Ourilândia do Norte' THEN -51.0833
    WHEN 'Ourém' THEN -47.1131
    WHEN 'Pacajá' THEN -50.6378
    WHEN 'Paragominas' THEN -47.3500
    WHEN 'Parauapebas' THEN -49.9048
    WHEN 'Peixe-Boi' THEN -47.3236
    WHEN 'Placas' THEN -54.2172
    WHEN 'Portel' THEN -50.8211
    WHEN 'Porto de Moz' THEN -52.2378
    WHEN 'Prainha' THEN -53.4786
    WHEN 'Primavera' THEN -47.1178
    WHEN 'Redenção' THEN -50.0314
    WHEN 'Rio Maria' THEN -49.9744
    WHEN 'Rondon do Pará' THEN -48.0681
    WHEN 'Rurópolis' THEN -54.9083
    WHEN 'Salinópolis' THEN -47.3561
    WHEN 'Salvaterra' THEN -48.5117
    WHEN 'Santa Bárbara' THEN -48.2936
    WHEN 'Santa Cruz do Arari' THEN -49.1783
    WHEN 'Santa Isabel do Pará' THEN -48.1614
    WHEN 'Santa Luzia do Pará' THEN -46.9000
    WHEN 'Santa Maria das Barreiras' THEN -49.7200
    WHEN 'Santa Maria do Pará' THEN -47.5744
    WHEN 'Santana do Araguaia' THEN -50.3497
    WHEN 'Santarém' THEN -54.7081
    WHEN 'Santarém Novo' THEN -47.3842
    WHEN 'Santo Antônio do Tauá' THEN -48.1314
    WHEN 'São Caetano de Odivelas' THEN -48.0142
    WHEN 'São Domingos do Araguaia' THEN -48.7339
    WHEN 'São Domingos do Capim' THEN -47.7656
    WHEN 'São Félix do Xingu' THEN -51.9902
    WHEN 'São Francisco do Pará' THEN -47.7872
    WHEN 'São Geraldo do Araguaia' THEN -48.5569
    WHEN 'São João de Pirabas' THEN -47.1783
    WHEN 'São João do Araguaia' THEN -48.7917
    WHEN 'São Miguel do Guamá' THEN -47.4828
    WHEN 'São Sebastião da Boa Vista' THEN -49.5283
    WHEN 'Sapucaia' THEN -49.6861
    WHEN 'Senador José Porfírio' THEN -51.5733
    WHEN 'Soure' THEN -48.5228
    WHEN 'Tailândia' THEN -48.9525
    WHEN 'Terra Alta' THEN -47.8981
    WHEN 'Terra Santa' THEN -56.4922
    WHEN 'Tomé-Açu' THEN -48.1506
    WHEN 'Tracuateua' THEN -46.9000
    WHEN 'Trairão' THEN -55.9444
    WHEN 'Tucumã' THEN -51.1500
    WHEN 'Tucuruí' THEN -49.6727
    WHEN 'Ulianópolis' THEN -47.4833
    WHEN 'Uruará' THEN -53.7272
    WHEN 'Vigia' THEN -48.1417
    WHEN 'Viseu' THEN -46.1306
    WHEN 'Vitória do Xingu' THEN -52.0167
    WHEN 'Xinguara' THEN -49.9431
    ELSE longitude
END;

-- Passo 5: Verificar quantas foram geolocalizadas
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as geolocalizadas,
    COUNT(CASE WHEN latitude IS NULL THEN 1 END) as sem_coordenadas
FROM dcomarcas;

-- Passo 6: Listar as que NÃO foram geolocalizadas (para debug)
SELECT idcomarca, comarca, latitude, longitude 
FROM dcomarcas 
WHERE latitude IS NULL
ORDER BY comarca;
