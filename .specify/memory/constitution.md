<!--
Sync Impact Report:
- Version change: none -> 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] -> I. Qualidade de Código e Tipagem Estrita
  - [PRINCIPLE_2_NAME] -> II. Arquitetura Modular e Escopo Delimitado
  - [PRINCIPLE_3_NAME] -> III. Geração de Artefatos Dinâmica e Offline
  - [PRINCIPLE_4_NAME] -> IV. Design Responsivo Mobile-First e Identidade Natural
  - [PRINCIPLE_5_NAME] -> V. Acessibilidade Mínima e SEO Dinâmico
- Added sections: None
- Removed sections: None
- Templates requiring updates:
  - ✅ plan-template.md (.specify/templates/plan-template.md)
  - ✅ spec-template.md (.specify/templates/spec-template.md)
  - ✅ tasks-template.md (.specify/templates/tasks-template.md)
- Follow-up TODOs: None
-->

# Ecotech Constitution

## Core Principles

### I. Qualidade de Código e Tipagem Estrita
O projeto MUST utilizar TypeScript em modo estrito (strict mode: true) sem o uso de any implícito. Componentes de interface (UI) MUST ser funcionais e isolados da lógica de negócio. É obrigatória a criação automática de branches específicas (`feature/nome-da-feature`) antes do início do desenvolvimento de cada funcionalidade.

### II. Arquitetura Modular e Escopo Delimitado
O sistema MUST dividir-se em rotas públicas otimizadas para SEO (trilhas, pontos educativos e parceiros), rotas autenticadas (dashboards do administrador e da escola, feed social, biblioteca) e microsserviços/módulos dedicados para a geração de artefatos. Funcionalidades fora do escopo atual (como aplicativo nativo, geolocalização própria, chat, pagamentos e realidade aumentada) MUST NOT ser desenvolvidas nesta fase.

### III. Geração de Artefatos Dinâmica e Offline
Todo ponto educativo MUST gerar dinamicamente uma página pública, uma ficha técnica em PDF padronizada e um QR Code Híbrido. O QR Code gerado MUST conter um resumo de texto de no máximo 250 caracteres legível sem conexão com a internet, seguido da URL da página web para quando o sinal estiver disponível.

### IV. Design Responsivo Mobile-First e Identidade Natural
Todas as páginas e componentes do sistema MUST ser responsivos e adaptados primariamente para celulares (a partir de 320px de largura), expandindo de forma fluida para tablets e desktops. A interface MUST seguir a paleta cromática de Verde Escuro (primário), Verde Claro (secundário) e Bege (fundo).

### V. Acessibilidade Mínima e SEO Dinâmico
O sistema MUST assegurar contraste de cores adequado (conforme WCAG AA), botões e links claramente rotulados com aria-labels, e tags `alt` descritivas em todas as imagens. Além disso, as páginas públicas MUST ter meta tags dinâmicas baseadas nos dados do banco para otimização de busca e compartilhamento em redes sociais.

## Infraestrutura e Deploy
O processo de build e deploy de novas features MUST ser automatizado por pipeline de CI/CD integrada ao fluxo de branches do repositório Git. A infraestrutura de hospedagem MUST suportar a execução da aplicação web responsiva, um banco de dados relacional e armazenamento seguro na nuvem para arquivos de mídia e PDFs.

## Procedimento de Validação e Desenvolvimento
Cada desenvolvedor ou agente de IA MUST auditar suas alterações em relação a esta Constituição antes do envio de commits. O código MUST compilar sem avisos e o layout deve ser validado nas resoluções mobile, tablet e desktop.

## Governance
Esta Constituição é o documento de governança supremo do projeto Ecotech. Qualquer modificação nestes princípios requer aprovação formal, devendo ser registrada com incremento da versão em conformidade com as regras de versionamento semântico. Os modelos de planos, especificações e listas de tarefas do projeto baseiam-se nestes princípios e devem ser atualizados em caso de emenda.

**Version**: 1.0.0 | **Ratified**: 2026-06-23 | **Last Amended**: 2026-06-23
