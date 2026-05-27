-- PASSO 4: Import BNCC Skills (24 skills)
-- Execute este SQL no Supabase SQL Editor

INSERT INTO skills (name, code, description, category) VALUES
-- Matemática (3 skills)
('Operações Básicas', 'operacoes-basicas', 'Adição, subtração, multiplicação e divisão', 'Matemática'),
('Álgebra', 'algebra', 'Equações, expressões algébricas e funções', 'Matemática'),
('Geometria', 'geometria', 'Figuras geométricas, áreas e volumes', 'Matemática'),

-- Ciências (3 skills)
('Física Clássica', 'fisica-classica', 'Mecânica, termodinâmica e ótica', 'Ciências'),
('Química', 'quimica', 'Reações químicas, tabela periódica e ácidos/bases', 'Ciências'),
('Biologia', 'biologia', 'Células, genética, evolução e ecossistemas', 'Ciências'),

-- Português (3 skills)
('Leitura e Interpretação', 'leitura-interpretacao', 'Compreensão de textos literários e informativos', 'Português'),
('Escrita e Redação', 'escrita-redacao', 'Composição de textos, ortografia e pontuação', 'Português'),
('Literatura Brasileira', 'literatura-brasileira', 'Movimentos literários, autores e obras clássicas', 'Português'),

-- História (3 skills)
('História Antiga', 'historia-antiga', 'Egito, Grécia, Roma e civilizações antigas', 'História'),
('História Medieval e Moderna', 'historia-medieval-moderna', 'Idade Média, Renascimento e transformações sociais', 'História'),
('História Contemporânea', 'historia-contemporanea', 'Mundo moderno, guerras mundiais e história contemporânea', 'História'),

-- Geografia (3 skills)
('Cartografia', 'cartografia', 'Mapas, coordenadas geográficas e escala', 'Geografia'),
('Geologia', 'geologia', 'Formação terrestre, relevo, clima e biomas', 'Geografia'),
('Geografia Humana', 'geografia-humana', 'População, economia, política e espaço geográfico', 'Geografia'),

-- Educação Física (3 skills)
('Esportes Coletivos', 'esportes-coletivos', 'Futebol, basquete, vôlei e handball', 'Educação Física'),
('Esportes Individuais', 'esportes-individuais', 'Atletismo, natação, ginástica e luta', 'Educação Física'),
('Saúde e Bem-estar', 'saude-bem-estar', 'Nutrição, exercício físico e qualidade de vida', 'Educação Física'),

-- Artes (3 skills)
('Artes Visuais', 'artes-visuais', 'Pintura, escultura, fotografia e design', 'Artes'),
('Música', 'musica', 'Notas, ritmo, instrumentos e história da música', 'Artes'),
('Artes Cênicas', 'artes-cenicas', 'Teatro, dança e performance', 'Artes'),

-- Inglês (3 skills)
('Vocabulário Inglês', 'vocabulario-ingles', 'Palavras, expressões e phrasal verbs', 'Inglês'),
('Gramática Inglesa', 'gramatica-inglesa', 'Tempos verbais, estruturas e sintaxe', 'Inglês'),
('Conversação Inglesa', 'conversacao-inglesa', 'Listening, speaking e compreensão auditiva', 'Inglês');
