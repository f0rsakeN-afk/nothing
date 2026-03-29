# Nothing

**Nothing** is a full-stack AI-powered system that combines a microservice backend architecture with a Bun gateway, providing an advanced **search engine**, **system design simulator**, and **real-time scraping** capabilities. It supports **RAG (Retrieval-Augmented Generation)** using LangChain, caching via Redis, and persistent storage in PostgreSQL.  

---

## Features

- **Bun + Express Gateway**: Routes requests, handles JWT authentication, and aggregates results from services.  
- **Search Service**: AI-powered search engine with RAG and Redis caching.  
- **Design Service**: Generates system design diagrams and JSON structures.  
- **Auth Service**: Handles JWT-based login and authentication.  
- **Scraper Service**: Automatically fetches content from websites for search enrichment.  
- **Shared Config**: Centralized environment variables, secrets, and helper utilities.  
- **Microservices Architecture**: Each service is independently deployable and scalable.  
- **Redis Caching**: Improves performance for repeated queries.  
- **PostgreSQL + pgvector**: Stores embeddings and structured data for AI queries.  

---

## Tech Stack

- **Gateway**: Bun, Express, Axios, dotenv  
- **Backend Services**: FastAPI, Python 3.12, Pydantic  
- **Database**: PostgreSQL with pgvector  
- **Caching**: Redis  
- **AI / RAG**: LangChain  
- **Scraping**: Requests, Playwright automation
- **Authentication**: JWT with shared secret key  

---
