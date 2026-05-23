# PRD — CRM com IA para Captação de Matrículas
## Colégio Madre de Deus

**Versão:** 0.1  
**Status:** Documento-base para definição do MVP  
**Objetivo:** Estruturar o desenvolvimento de um CRM interno com IA para captação, qualificação, acompanhamento e análise de leads de matrícula das 4 unidades do colégio.

---

# 1. Visão Geral do Produto

O CRM será uma plataforma interna do Colégio Madre de Deus para centralizar todos os leads captados pela landing page de matrículas, organizar o atendimento comercial, gerar inteligência por unidade e apoiar a conversão de interessados em matrículas.

A solução deverá:

- Receber automaticamente os leads vindos da landing page atual;
- Registrar e organizar os dados em um banco centralizado;
- Permitir acompanhamento em funil comercial;
- Disponibilizar dashboards e gráficos gerenciais;
- Utilizar IA para qualificação, resumo e classificação dos contatos;
- Permitir acesso seguro por login e senha;
- Possuir área administrativa para gestão de usuários, permissões e identidade visual;
- Dar visibilidade ampla para a direção e visibilidade segmentada para usuários de cada unidade.

---

# 2. Objetivos de Negócio

## 2.1 Objetivo principal

Aumentar a eficiência da captação de matrículas por meio de:

- Melhor organização dos leads;
- Menor perda de contatos;
- Atendimento mais rápido;
- Acompanhamento da jornada até a matrícula;
- Dados gerenciais confiáveis para tomada de decisão.

## 2.2 Resultados esperados

- Identificar quantos pais/responsáveis procuram cada unidade;
- Identificar as séries e faixas com maior demanda;
- Medir evolução da captação por dia, semana, mês e campanha;
- Reduzir leads sem resposta;
- Melhorar a taxa de visita e matrícula;
- Acompanhar a performance da equipe e das unidades;
- Criar uma base proprietária de inteligência comercial.

---

# 3. Escopo do MVP

O MVP deverá conter os módulos abaixo.

## 3.1 Captura e entrada de leads

- Integração com a landing page de matrículas atual;
- Recebimento automático dos envios de formulário;
- Registro de data e hora da conversão;
- Captura de parâmetros de origem e campanha quando disponíveis;
- Criação automática de lead no CRM;
- Prevenção básica de duplicidade por telefone e/ou e-mail.

## 3.2 Gestão de leads

- Lista geral de leads;
- Busca e filtros;
- Visualização detalhada do lead;
- Edição de dados;
- Alteração de status no funil;
- Inclusão de observações internas;
- Registro de histórico de movimentações;
- Atribuição de responsável pelo atendimento.

## 3.3 Funil comercial

Sugestão inicial de etapas:

1. Novo lead;
2. Em primeiro atendimento;
3. Contato realizado;
4. Visita agendada;
5. Visita realizada;
6. Em negociação;
7. Matrícula concluída;
8. Perdido.

Cada movimentação deverá ficar registrada com:

- Etapa anterior;
- Nova etapa;
- Usuário que fez a alteração;
- Data e hora.

## 3.4 IA aplicada ao processo

A IA deverá apoiar, inicialmente, com:

- Resumo automático das informações recebidas;
- Classificação inicial do lead;
- Extração estruturada de dados quando houver conversa textual;
- Sugestão de prioridade;
- Identificação de interesse principal;
- Sugestão de próximo passo de atendimento.

Exemplos de classificação:

- Unidade de interesse;
- Série procurada;
- Urgência percebida;
- Interesse em visita;
- Lead quente, morno ou frio.

## 3.5 Dashboard executivo

O CRM deverá apresentar painéis visuais com dados estratégicos.

### Indicadores gerais

- Total de leads captados;
- Leads por período;
- Leads por unidade;
- Leads por série;
- Leads por origem/campanha;
- Leads por etapa do funil;
- Visitas agendadas;
- Matrículas concluídas;
- Taxa de conversão;
- Leads sem atendimento;
- Tempo médio de primeiro contato.

### Gráficos prioritários

- Barras: leads por unidade;
- Linha: evolução de leads no tempo;
- Barras: procura por série;
- Funil: conversão por etapa;
- Barras ou tabela: origem dos leads;
- Tabela: ranking de unidades por captação;
- Tabela: leads pendentes de atendimento.

## 3.6 Dashboard por unidade

Cada unidade deverá ter uma visão segmentada para acompanhar:

- Quantos leads chegaram para aquela unidade;
- Quais séries são mais procuradas;
- Evolução da procura;
- Conversão em visitas;
- Conversão em matrícula;
- Leads parados por etapa;
- Performance de atendimento.

---

# 4. Autenticação, Login e Segurança

## 4.1 Login e senha

O sistema deverá exigir autenticação individual para cada usuário.

### Requisitos

- Login por e-mail e senha;
- Recuperação de senha;
- Cadastro de usuário controlado pela área administrativa;
- Senhas armazenadas de forma segura;
- Sessão autenticada;
- Logout;
- Controle de acesso por perfil.

## 4.2 Perfis de acesso

O sistema deverá possuir, no mínimo, os seguintes perfis.

### 1. Super Administrador
Acesso total ao sistema.

Permissões:

- Gerenciar todos os usuários;
- Criar, editar e remover usuários;
- Definir perfis e permissões;
- Visualizar leads de todas as unidades;
- Visualizar todos os dashboards;
- Alterar configurações gerais;
- Configurar marca, logotipo e identidade visual;
- Gerenciar etapas do funil, se essa função for incluída no MVP;
- Acessar relatórios globais;
- Auditar movimentações no sistema.

### 2. Administrador Geral
Acesso amplo à operação, com possíveis restrições em configurações críticas.

Permissões:

- Visualizar leads de todas as unidades;
- Acompanhar dashboards globais;
- Exportar relatórios;
- Acompanhar atendimento;
- Reatribuir leads;
- Editar dados operacionais.

### 3. Gestor de Unidade
Acesso limitado à unidade sob sua gestão.

Permissões:

- Visualizar leads da própria unidade;
- Acompanhar dashboards da unidade;
- Atribuir leads à equipe da unidade;
- Atualizar status de leads da unidade;
- Consultar relatórios específicos da unidade.

### 4. Atendente / Comercial
Acesso operacional.

Permissões:

- Visualizar leads atribuídos ou liberados da sua unidade;
- Registrar atendimento;
- Alterar status do lead;
- Adicionar observações;
- Sinalizar lead como convertido ou perdido conforme regra.

### 5. Usuário de Marketing ou BI
Acesso analítico, sem interferência direta no atendimento.

Permissões:

- Visualizar dashboards e relatórios;
- Consultar dados consolidados;
- Acompanhar origem e performance dos leads;
- Exportar dados, se autorizado.

---

# 5. Área Administrativa

O CRM deverá possuir um módulo administrativo para configuração e governança da plataforma.

## 5.1 Gestão de usuários

Funções:

- Adicionar novo usuário;
- Editar usuário existente;
- Alterar perfil de acesso;
- Vincular usuário a uma ou mais unidades;
- Ativar ou inativar usuário;
- Resetar senha;
- Consultar data de criação e último acesso.

## 5.2 Gestão de permissões

A área administrativa deverá permitir definir quem pode:

- Visualizar todos os leads;
- Visualizar apenas leads da própria unidade;
- Editar leads;
- Exportar relatórios;
- Visualizar dashboards globais;
- Gerenciar usuários;
- Acessar configurações.

## 5.3 Marca e identidade visual

A plataforma deverá seguir a identidade institucional do Colégio Madre de Deus e permitir personalização visual coerente com a marca.

### Paleta oficial do CRM

- **Branco:** `#FFFFFF`
- **Azul principal:** `#303e69`
- **Laranja de apoio:** `#f47c27`

### Diretrizes de aplicação

- O **branco** deverá ser predominante em fundos, cards, áreas de conteúdo e espaços de respiro visual;
- O **azul `#303e69`** será a cor estrutural principal, aplicada em menu lateral, cabeçalhos, títulos, botões primários, elementos ativos e componentes institucionais;
- O **laranja `#f47c27`** será utilizado como cor de apoio para destaques, botões secundários, indicadores relevantes, alertas leves e chamadas visuais dentro dos dashboards;
- A interface deverá manter uma aparência limpa, profissional e alinhada ao posicionamento do colégio, evitando excesso de cor e priorizando legibilidade.

### Aplicações esperadas

- Tela de login com logotipo e presença do azul institucional;
- Menu lateral em azul `#303e69`;
- Área principal predominantemente branca;
- Botões primários em azul;
- Elementos de destaque e apoio em laranja;
- Gráficos com predominância do azul e uso pontual do laranja para contraste e sinalização.

### Itens administráveis

- Upload do logotipo do colégio;
- Nome da instituição exibido no sistema;
- Exibição da marca na tela de login e no painel interno.

## 5.4 Configurações gerais

Itens que podem ser administráveis:

- Unidades do colégio;
- Etapas do funil;
- Motivos de perda;
- Origem dos leads;
- Regras básicas de SLA;
- Parâmetros de campanhas, quando aplicável.

---

# 6. Estrutura de Dados Recomendada

## 6.1 Tabela: usuários

Campos sugeridos:

- id;
- nome;
- e-mail;
- senha_hash;
- perfil;
- status;
- unidade_id, quando aplicável;
- created_at;
- last_login_at.

## 6.2 Tabela: unidades

Campos sugeridos:

- id;
- nome da unidade;
- endereço resumido;
- status;
- created_at.

## 6.3 Tabela: leads

Campos sugeridos:

- id;
- nome do responsável;
- nome do aluno, se capturado;
- telefone;
- e-mail;
- idade;
- série de interesse;
- unidade de interesse;
- escola de origem;
- origem do lead;
- campanha;
- canal;
- status atual;
- prioridade;
- score_ia;
- responsável interno;
- consentimento de comunicação;
- created_at;
- updated_at.

## 6.4 Tabela: histórico do lead

- id;
- lead_id;
- evento;
- descrição;
- usuário_id;
- created_at.

## 6.5 Tabela: movimentação de funil

- id;
- lead_id;
- etapa_anterior;
- nova_etapa;
- usuário_id;
- created_at.

## 6.6 Tabela: observações internas

- id;
- lead_id;
- usuário_id;
- observação;
- created_at.

## 6.7 Tabela: atividades/tarefas

- id;
- lead_id;
- tipo de atividade;
- descrição;
- responsável;
- prazo;
- status;
- created_at.

---

# 7. Regras de Negócio Iniciais

## 7.1 Deduplicação

Quando um novo lead entrar:

- Verificar se telefone já existe;
- Verificar se e-mail já existe;
- Em caso de possível duplicidade, atualizar ou sinalizar para revisão, conforme regra definida.

## 7.2 Distribuição por unidade

- Todo lead deverá estar associado a uma unidade de interesse;
- Gestores e atendentes devem enxergar apenas os leads permitidos por sua configuração;
- Administradores globais enxergam todos.

## 7.3 Registro de auditoria

Eventos relevantes devem ser registrados, como:

- Criação de lead;
- Alteração de status;
- Alteração de responsável;
- Edição de dados;
- Conversão;
- Perda;
- Ações de usuários administrativos.

## 7.4 Indicadores confiáveis

Os dashboards devem usar dados estruturados e histórico de eventos, não apenas o status atual do lead.

---

# 8. Principais Riscos do Projeto

## 8.1 Escopo excessivo no início

Risco de tentar lançar uma plataforma completa demais e perder foco no que gera resultado imediato.

Mitigação:

- Definir MVP claro;
- Priorizar captação, funil, IA básica e dashboard.

## 8.2 Dados ruins ou inconsistentes

Risco de relatórios incorretos se os campos forem mal preenchidos ou mal interpretados.

Mitigação:

- Validações de formulário;
- Padrões de cadastro;
- Revisão de estrutura de dados.

## 8.3 Duplicidade de leads

Risco de superestimar a demanda e duplicar atendimentos.

Mitigação:

- Regras de deduplicação;
- Alertas de possível duplicidade.

## 8.4 IA classificando de forma imprecisa

Risco de interpretação equivocada dos dados.

Mitigação:

- Uso da IA como apoio e não como autoridade final;
- Campos estruturados;
- Validação antes de decisões críticas.

## 8.5 Gestão inadequada de acesso

Risco de usuários visualizarem informações além do necessário.

Mitigação:

- Permissões por perfil;
- Vínculo com unidade;
- Registro de auditoria.

## 8.6 Ausência de governança e manutenção

Risco de o CRM se tornar desatualizado e perder utilidade.

Mitigação:

- Definir dono do produto;
- Criar rotina de melhoria contínua;
- Revisar dashboards e etapas periodicamente.

---

# 9. Sugestão de Arquitetura Técnica

## 9.1 Front-end

- Aplicação web responsiva;
- Interface administrativa;
- Tela de login;
- Painel operacional;
- Dashboards.

## 9.2 Back-end e banco

- API para recebimento dos leads;
- Banco relacional;
- Controle de usuários;
- Regras de permissão;
- Histórico e auditoria.

## 9.3 IA

- Serviço para análise e qualificação;
- Geração de resumo;
- Classificação de prioridade;
- Estruturação de dados.

## 9.4 Integrações

- Landing page atual;
- Futuramente: WhatsApp, automações e outros canais.

---

# 10. Roadmap Recomendado

## Fase 1 — Fundação do CRM

- Banco de dados;
- Login e autenticação;
- Perfis e permissões;
- Área administrativa;
- Cadastro de unidades;
- Integração com LP;
- Entrada automática de leads;
- Tela de listagem e detalhe;
- Funil inicial.

## Fase 2 — Gestão e BI

- Dashboard global;
- Dashboard por unidade;
- Gráficos e filtros;
- Relatórios;
- Exportação de dados;
- Indicadores de atendimento.

## Fase 3 — IA e automação

- IA para qualificação;
- Resumos;
- Score;
- Sugestão de próximo passo;
- Alertas e prioridades.

## Fase 4 — Expansão

- Integração com WhatsApp;
- Automação de follow-up;
- Agenda de visitas;
- Relatórios avançados;
- Histórico ampliado da jornada do lead.

---

# 11. Critérios de Sucesso do MVP

O MVP será considerado bem-sucedido quando:

- Os leads da landing page entrarem automaticamente no CRM;
- A equipe conseguir acompanhar cada lead em um funil;
- A direção visualizar dados por unidade;
- O sistema permitir gestão de usuários e permissões;
- O CRM exibir dashboards confiáveis;
- A IA agregar valor na organização e qualificação dos leads;
- O processo reduzir dependência de planilhas manuais.

---

# 12. Próximas Definições Necessárias

Para seguir ao detalhamento técnico e desenvolvimento, ainda será necessário definir:

1. Nome oficial do sistema;
2. Perfis finais de usuário;
3. Regras exatas de permissão;
4. Campos obrigatórios no cadastro de lead;
5. Se o funil inicial será padrão ou customizável;
6. Se haverá exportação em CSV/Excel no MVP;
7. Se a IA atuará apenas no backoffice ou também em chat conversacional;
8. Se o WhatsApp entra no MVP ou em fase posterior;
9. Quem será o administrador master do sistema;
10. Quais indicadores serão considerados prioritários pela direção.
