
# Adagio - Gemini Development Context

## Project Overview

This is a Next.js application called "Adagio", a Pomodoro timer designed to help users focus. It uses Firebase for backend services, including Firestore for the database and Firebase Authentication. The application is a Progressive Web App (PWA) and leverages Genkit for AI-powered features like summarizing work sessions. The UI is built with React, TypeScript, and Tailwind CSS, utilizing a component library from `shadcn/ui`.

## Building and Running

-   **Development:** `npm run dev`
-   **Genkit Development:** `npm run genkit:dev`
-   **Build:** `npm run build`
-   **Start:** `npm run start`
-   **Lint:** `npm run lint`
-   **Typecheck:** `npm run typecheck`

## Development Conventions

-   **Styling:** Tailwind CSS with `clsx` and `tailwind-merge` for utility class composition.
-   **Components:** Reusable UI components are located in `src/components/ui` and follow the `shadcn/ui` conventions.
-   **State Management:** A combination of React hooks (`useState`, `useEffect`, `useCallback`) and React Context for authentication (`AuthContext`) and other shared state. The core timer logic is encapsulated in the `useTimer` hook.
-   **Types:** TypeScript is used throughout the project. Type definitions are located in `src/types`.
-   **Firebase:** Firebase services are initialized in `src/lib/firebase.ts`.
-   **AI:** AI-powered features are implemented using Genkit and are located in the `src/ai` directory.
-   **PWA:** The application is configured as a PWA using `next-pwa`.
-   **Linting & Formatting:** ESLint is used for linting. Code formatting conventions should be inferred from the existing code.
