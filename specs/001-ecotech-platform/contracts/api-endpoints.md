# API Endpoints Contract: Ecotech Platform

Este documento especifica os principais contratos de endpoints da API NestJS para integração com o frontend Next.js.

## 1. Autenticação (`/api/auth`)

### POST `/api/auth/login`
* **Descrição**: Valida as credenciais do usuário e injeta um Cookie HTTP-Only contendo o Token JWT.
* **Payload (JSON)**:
  ```json
  {
    "email": "user@school.com",
    "password": "securepassword123"
  }
  ```
* **Resposta (200 OK)**:
  ```json
  {
    "user": {
      "id": "e30e6efc-9742-4f7f-a6a9-858055ee5167",
      "name": "João Professor",
      "email": "user@school.com",
      "role": "TEACHER",
      "schoolId": "a9a3f2d2-8b4b-4b13-ba14-5eeae17b9b1e"
    }
  }
  ```

---

## 2. Trilhas (`/api/trails`)

### GET `/api/trails`
* **Descrição**: Retorna a lista de trilhas publicadas com suporte a paginação e filtros (município, bioma, dificuldade, extensão).
* **Parâmetros de Query**: `?page=1&limit=10&city=Florianopolis&difficulty=FACIL`
* **Resposta (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "c1a93bde-1111-2222-3333-444455556666",
        "title": "Trilha do Mangue Vermelho",
        "slug": "trilha-do-mangue-vermelho",
        "shortDescription": "Explore a rica flora e fauna de transição do manguezal.",
        "city": "Florianópolis",
        "coverImage": "https://ecotech-storage.s3.amazonaws.com/trails/mangue-capa.jpg",
        "biome": "Mata Atlântica",
        "distanceKm": 1.8,
        "duration": "1h 30m",
        "difficulty": "FACIL",
        "likesCount": 24,
        "viewsCount": 150
      }
    ],
    "meta": { "total": 1, "page": 1, "lastPage": 1 }
  }
  ```

### GET `/api/trails/:slug`
* **Descrição**: Detalhamento público completo de uma trilha específica (Abas Sobre, Biodiversidade, Pontos, Avisos).
* **Resposta (200 OK)**:
  ```json
  {
    "id": "c1a93bde-1111-2222-3333-444455556666",
    "title": "Trilha do Mangue Vermelho",
    "slug": "trilha-do-mangue-vermelho",
    "shortDescription": "Explore a rica flora...",
    "fullDescription": "Descrição maior sobre a trilha e contexto...",
    "city": "Florianópolis",
    "coverImage": "https://ecotech-storage.s3.amazonaws.com/trails/mangue-capa.jpg",
    "biome": "Mata Atlântica",
    "distanceKm": 1.8,
    "duration": "1h 30m",
    "difficulty": "FACIL",
    "wikilocUrl": "https://www.wikiloc.com/ecotech-trail-example",
    "safetyWarnings": "Atenção a trechos íngremes. Levar água. Respeitar a fauna.",
    "school": {
      "id": "a9a3f2d2-8b4b-4b13-ba14-5eeae17b9b1e",
      "name": "Escola Estadual João da Silva"
    },
    "biodiversity": [
      {
        "id": "b123-f1",
        "groupType": "fauna",
        "popularName": "Caranguejo Uçá",
        "scientificName": "Ucides cordatus",
        "description": "Espécie típica de manguezais...",
        "image": "https://ecotech-storage.s3.amazonaws.com/bio/caranguejo.jpg",
        "curiosities": "Fica entocado na maré alta.",
        "environmentalImportance": "Essencial na ciclagem de nutrientes."
      }
    ],
    "points": [
      {
        "id": "p001-mv",
        "title": "Mangue Vermelho",
        "slug": "mangue-vermelho",
        "type": "MANGUEZAL",
        "order": 1,
        "shortDescription": "Árvore típica com raízes escoras.",
        "mainImage": "https://ecotech-storage.s3.amazonaws.com/points/mangue-vermelho.jpg"
      }
    ]
  }
  ```

---

## 3. Pontos Educativos e QR Code (`/api/educational-points`)

### GET `/api/educational-points/:slug`
* **Descrição**: Visualização completa de um ponto educativo com link para download de PDF e metadados de QR Code.
* **Resposta (200 OK)**:
  ```json
  {
    "id": "p001-mv",
    "title": "Mangue Vermelho",
    "slug": "mangue-vermelho",
    "type": "MANGUEZAL",
    "order": 1,
    "shortDescription": "Árvore típica com raízes escoras.",
    "fullDescription": "O mangue-vermelho (Rhizophora mangle) é característico...",
    "curiosities": "Suas raízes parecem pernas que escoram a planta no lodo.",
    "environmentalImportance": "Estabiliza o solo lodoso do estuário e serve de berçário.",
    "preservationCare": "Não quebrar galhos ou subir nas raízes escoras expostas.",
    "mainImage": "https://ecotech-storage.s3.amazonaws.com/points/mangue-vermelho.jpg",
    "trail": {
      "title": "Trilha do Mangue Vermelho",
      "wikilocUrl": "https://www.wikiloc.com/ecotech-trail-example",
      "school": {
        "name": "Escola Estadual João da Silva"
      }
    },
    "pdfUrl": "https://ecotech-storage.s3.amazonaws.com/pdfs/p001-mv-ficha.pdf",
    "qrCode": {
      "textContent": "Ponto: Mangue Vermelho\nTrilha: Trilha do Mangue Vermelho\nResumo: Árvore com raízes escoras típica de estuários.\nImportância: Estabilização do solo lodoso.\nhttps://ecotech.com/pontos/mangue-vermelho",
      "image": "data:image/png;base64,iVBORw0KGgoAAAANS..."
    }
  }
  ```

### GET `/api/educational-points/:slug/pdf`
* **Descrição**: Aciona a geração dinâmica e retorna o stream do PDF individual para download no frontend.
* **Resposta**: Arquivo binário (`application/pdf`)

---

## 4. Feed e Stories (`/api/feed`)

### GET `/api/feed`
* **Descrição**: Retorna posts ativos paginados e a lista de stories válidos (com expiração em aberto).
* **Resposta (200 OK)**:
  ```json
  {
    "stories": [
      {
        "id": "story-001",
        "mediaUrl": "https://ecotech-storage.s3.amazonaws.com/stories/story.jpg",
        "mediaType": "IMAGE",
        "user": {
          "name": "Ana Estudante",
          "profileImage": "https://ecotech-storage.s3.amazonaws.com/avatars/ana.jpg"
        },
        "school": {
          "name": "Escola Estadual João da Silva"
        }
      }
    ],
    "posts": [
      {
        "id": "post-100",
        "title": "Visita ao manguezal",
        "description": "Hoje coletamos amostras de água com o professor!",
        "mediaUrl": "https://ecotech-storage.s3.amazonaws.com/posts/visita.jpg",
        "mediaType": "IMAGE",
        "likesCount": 12,
        "commentsCount": 3,
        "sharesCount": 1,
        "createdAt": "2026-06-23T11:00:00Z",
        "user": {
          "name": "Gabriel Aluno",
          "profileImage": "https://ecotech-storage.s3.amazonaws.com/avatars/gabriel.jpg"
        },
        "school": {
          "name": "Escola Estadual João da Silva"
        }
      }
    ]
  }
  ```
