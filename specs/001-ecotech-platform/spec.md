# Feature Specification: Ecotech Platform

**Feature Branch**: `feature/ecotech-platform`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Construir a plataforma web responsiva Ecotech — Plataforma Educacional, Socioambiental e Territorial..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastro de Trilhas e Pontos Educativos (Priority: P1)
**Why this priority**: Este é o núcleo da plataforma, que possibilita a catalogação das rotas educacionais e o mapeamento dos pontos de interesse ecológico, viabilizando o propósito educacional.
**Independent Test**: Pode ser testado independentemente criando uma trilha com pontos associados através do formulário de criação e visualizando os detalhes da trilha gerada.
**Acceptance Scenarios**:
1. **Given** um usuário administrador ou escola logado, **When** preenche todos os campos obrigatórios da trilha (nome, município, bioma, extensão, etc) e clica em salvar como publicado, **Then** a trilha é persistida no banco e fica visível na listagem pública.
2. **Given** um usuário logado tentando criar uma trilha, **When** não preenche um campo obrigatório como "bioma", **Then** o sistema impede o envio e exibe validação de erro amigável.
3. **Given** um usuário logado como Estudante, **When** tenta acessar a rota de criação de trilhas, **Then** o sistema bloqueia o acesso e exibe erro de permissão.

### User Story 2 - Geração de QR Code e PDF Offline (Priority: P1)
**Why this priority**: Permite que a plataforma funcione como recurso pedagógico em trilhas físicas de campo onde a conectividade de dados pode ser limitada ou inexistente.
**Independent Test**: Pode ser testado gerando o QR Code de um ponto educativo cadastrado, escaneando-o em modo avião para verificar o texto offline e clicando no link para baixar o PDF quando houver rede.
**Acceptance Scenarios**:
1. **Given** um ponto educativo cadastrado com um resumo offline preenchido (máximo 250 caracteres), **When** o QR Code é gerado e escaneado, **Then** o scanner exibe o resumo textual do ponto seguido da URL pública.
2. **Given** a página pública do ponto educativo carregada online, **When** o usuário clica em "Baixar PDF", **Then** o sistema gera e fornece um arquivo PDF formatado com a identidade visual Ecotech e informações do ponto.

### User Story 3 - Feed Social e Stories Efêmeros (Priority: P2)
**Why this priority**: Promove o engajamento e a troca de experiências de "outdoor learning" entre alunos, professores e escolas parceiras.
**Independent Test**: Pode ser testado criando um post no feed com imagem e criando um story, validando a visibilidade no topo e a expiração programada de 24h.
**Acceptance Scenarios**:
1. **Given** um usuário logado (estudante, professor, escola ou admin), **When** envia uma publicação com título e mídia no feed, **Then** a publicação é inserida no feed público mostrando autor, escola e data.
2. **Given** um post criado no feed, **When** outro usuário logado clica em curtir ou comentar, **Then** os contadores de curtidas e a lista de comentários são atualizados em tempo real.
3. **Given** um story publicado há mais de 24 horas, **When** o feed principal é carregado, **Then** esse story não deve mais ser exibido no carrossel do topo.

### User Story 4 - Biblioteca de Recursos com Moderação (Priority: P2)
**Why this priority**: Centraliza cartilhas, guias e vídeos pedagógicos, mantendo controle de qualidade e integridade pedagógica das publicações institucionais.
**Independent Test**: Pode ser testado enviando um PDF do perfil de uma escola e aprovando/reprovando este conteúdo a partir do painel do Administrador.
**Acceptance Scenarios**:
1. **Given** um usuário de perfil Escola logado, **When** envia uma cartilha em PDF para a Biblioteca, **Then** o material é salvo com status "pendente" e não aparece para os demais usuários.
2. **Given** um material pendente na biblioteca, **When** o Administrador acessa a tela de moderação e clica em aprovar, **Then** o status muda para "aprovado" e o material torna-se disponível para download de todos.

### User Story 5 - Perfis de Escolas e Rede de Parceiros (Priority: P3)
**Why this priority**: Fomenta a conexão territorial e a valorização das comunidades locais que oferecem suporte logístico (alimentação, hospedagem, guias) para as atividades pedagógicas.
**Independent Test**: Pode ser testado listando as escolas e parceiros cadastrados e aplicando filtros de bioma, dificuldade e contatos do WhatsApp.
**Acceptance Scenarios**:
1. **Given** a página da escola aberta, **When** o usuário clica em "Seguir", **Then** a quantidade de seguidores da escola aumenta e o botão altera o estado visual para "Seguindo".
2. **Given** a listagem da Rede de parceiros locais, **When** o usuário clica no botão do WhatsApp de um parceiro ativo, **Then** abre uma nova aba direcionada para o chat do parceiro.

### Edge Cases
- O que acontece quando o upload de PDF ou imagens falha devido a limites de tamanho ou problemas de conexão? O sistema MUST interromper o fluxo com mensagem informativa e limpar arquivos temporários.
- Como o sistema se comporta ao escanear o QR Code em um dispositivo sem aplicativo leitor de QR Code dedicado? O sistema deve garantir que o formato do payload de texto plano seja nativo para que a câmera padrão de qualquer smartphone moderno renderize o resumo sem depender de app de terceiros.
- Como lidar com stories duplicados ou mídias corrompidas? O sistema deve validar formatos aceitos (imagens padrão e vídeo MP4) na seleção e deletar mídias corrompidas do storage após o erro.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: O sistema MUST suportar autenticação para 4 perfis de usuários com restrições rígidas de acesso (Admin, Escola, Professor, Estudante).
- **FR-002**: O sistema MUST permitir a criação de trilhas e pontos educativos por usuários Admin, Escola e Professor (sendo que professor visualiza/cria trilhas e biblioteca).
- **FR-003**: O sistema MUST gerar para cada ponto educativo uma página web pública, um PDF individual de download e um QR Code Híbrido com dados offline.
- **FR-004**: O resumo offline do ponto educativo inserido no QR Code MUST conter no máximo 250 caracteres para não estourar o limite de densidade e legibilidade física do código.
- **FR-005**: O feed social MUST aceitar publicações com imagens/vídeos de todos os perfis e Stories que expiram automaticamente em 24 horas.
- **FR-006**: Apenas o autor de um post e o Administrador possuem permissão para editar ou excluir a respectiva publicação no feed.
- **FR-007**: A Biblioteca de materiais MUST conter fluxo de aprovação prévia obrigatória feita por um Administrador para conteúdos enviados por escolas.
- **FR-008**: Links externos direcionando para o Wikiloc ou contatos de parceiros MUST abrir em novas abas (`target="_blank"`).
- **FR-009**: O painel de visualização de escolas MUST possuir filtros por bioma, dificuldade e extensão da trilha (Curta: < 2km, Intermediária: 2 a 5km, Longa: > 5km).

### Key Entities
- **User**: Representa as contas do sistema. Possui nome, e-mail, senha criptografada, perfil (Admin, Escola, Professor, Estudante) e escola vinculada.
- **School**: Representa as instituições de ensino cadastradas no sistema. Possui nome, localização, contatos e dados de seguidores.
- **Trail**: Representa uma trilha ecológica. Vinculada a uma Escola responsável e composta por metadados de bioma, extensão e dificuldades.
- **EducationalPoint**: Representa uma parada de aprendizado dentro de uma trilha. Vincula-se a uma trilha e possui o QR Code offline e PDF para download.
- **FeedPost / Story**: Entidades sociais de compartilhamento de fotos/vídeos.
- **LibraryContent**: Materiais didáticos na biblioteca (guias, cartilhas, vídeos) com status de aprovação.
- **Partner**: Cadastro de negócios e serviços comunitários locais (guias, pousadas, restaurantes).

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: O carregamento da página pública da trilha MUST ser de até 2 segundos em conexões 3G estáveis para visualização rápida no campo.
- **SC-002**: A geração do QR Code Híbrido e PDF MUST ser concluída em menos de 3 segundos após o salvamento do Ponto Educativo.
- **SC-003**: 100% dos QR Codes gerados devem ser perfeitamente escaneáveis por celulares padrão a partir de uma distância focal de 10cm.
- **SC-004**: Os Stories MUST sumir das listagens ativas em até 5 minutos após completarem 24 horas de vida.

## Assumptions
- Assume-se que a impressão física dos QR Codes e das fichas técnicas em PDF será feita de forma manual pelas escolas.
- Assume-se que o armazenamento das mídias (fotos das trilhas, imagens de posts, stories e arquivos PDF) utilizará infraestrutura cloud elástica (S3-compatible) para não sobrecarregar o storage do servidor de aplicação.
- Assume-se que os usuários possuirão smartphones com câmeras capazes de escanear QR Codes nativamente ou por meio de leitores comuns.
- Assume-se que o app funcionará de forma responsiva em navegadores modernos de celular, sem necessidade de app nativo.
