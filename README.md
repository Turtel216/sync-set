# SyncSet

<div align="center">
  <p><strong>Real-time collaborative setlist planner for musicians.</strong></p>
</div>

SyncSet is a live workspace where band members can log in, suggest songs for an upcoming gig, vote on them, and drag-and-drop tracks into a final setlist. Every action updates instantly across all connected clients in a specific session room.

## Features

- **Real-Time Collaboration**: Powered by Socket.io, every song added, vote cast, and setlist reorder is synced instantly to all band members currently viewing the gig.
- **Band & Gig Management**: Create bands, invite members (with role-based access control), and organize upcoming gigs.
- **Song Pool & Voting**: Suggest songs for a gig and vote on them. The song pool is automatically sorted by popularity.
- **Drag-and-Drop Setlist**: Intuitively build your setlist by dragging songs from the pool into the setlist, and reordering them on the fly.
- **Optimistic UI**: Drag-and-drop interactions feel instantaneous thanks to optimistic state updates before server confirmation.
- **Modern Tech Stack**: Built with React, Vite, Tailwind CSS v4, Node.js, Express, Prisma, PostgreSQL, and Effect.

## Architecture

SyncSet utilizes a client-server architecture with real-time bidirectional communication.

- **Frontend**: React SPA built with Vite. Uses Tailwind CSS v4 for styling, `lucide-react` for icons, and `@dnd-kit` for complex drag-and-drop interactions.
- **Backend**: Node.js REST API with Express. Data modeling and migrations are handled by Prisma ORM over a PostgreSQL database.
- **Real-Time Engine**: Socket.io handles live state synchronization within Gig "rooms". The server acts as the single source of truth, broadcasting authoritative state changes to all clients.
- **Business Logic**: The `@effect/schema` and `effect` libraries are used on the backend for robust, functional error handling and typed services.

## Getting Started

The easiest way to run SyncSet locally is using Docker Compose, which spins up the database, backend, and frontend proxy.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- (Optional) Node.js 22+ for local development without Docker

### Running with Docker Compose

1. **Clone the repository:**
   ```bash
   git clone 
   cd 
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory. You can use the provided `.env.example` as a starting point.
   ```bash
   cp .env.example .env
   ```
   *Note: The `docker-compose.yml` provides default credentials that work out of the box for local development.*

3. **Start the Services:**
   ```bash
   docker compose up --build -d
   ```

4. **Access the Application:**
   Open your browser and navigate to [http://localhost](http://localhost).

   *The backend API and Socket.io server are routed through the Nginx proxy on port 80, but can also be accessed directly on port 3001.*

### Local Development Setup

If you prefer to run the services directly on your host machine:

1. **Start a PostgreSQL instance** and update the `DATABASE_URL` in your `.env` file.
2. **Install Backend Dependencies:**
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```
3. **Start Backend Server:**
   ```bash
   npm run dev
   ```
4. **Install Frontend Dependencies & Start Vite:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
5. Access the development frontend at [http://localhost:5173](http://localhost:5173).

## Database Schema

SyncSet uses Prisma to manage 6 core models:
- **User**: Authentication and identity.
- **Band**: A group of users.
- **BandMember**: Join table with `ADMIN` or `MEMBER` roles.
- **Gig**: An event belonging to a band. Acts as a Socket.io room.
- **Song**: A track suggested for a gig, tracking its `setlistOrder`.
- **Vote**: A user's upvote (+1) or downvote (-1) on a specific song.

## License

This project is licensed under the MIT License.
