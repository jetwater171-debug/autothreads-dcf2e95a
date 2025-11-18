# AI Rules for Threads Automation Project

This document outlines the core technologies used in this project and provides guidelines for using specific libraries to maintain consistency and best practices.

## Tech Stack Overview

*   **Frontend Framework**: React.js
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS for all styling, ensuring responsive and utility-first design.
*   **UI Components**: shadcn/ui, built on Radix UI primitives, for a consistent and accessible user interface.
*   **Routing**: React Router DOM for client-side navigation.
*   **Data Fetching & State Management**: React Query for efficient server state management.
*   **Icons**: Lucide React for scalable and customizable vector icons.
*   **Form Management**: React Hook Form for robust form handling, paired with Zod for schema validation.
*   **Backend & Database**: Supabase for authentication, database, and serverless functions (Edge Functions).

## Library Usage Rules

To ensure a cohesive and maintainable codebase, please adhere to the following guidelines when developing:

*   **UI Components**:
    *   Always prioritize using existing `shadcn/ui` components from `src/components/ui/`.
    *   If a required component is not available in `shadcn/ui` or needs significant custom logic, create a new component in `src/components/` and style it exclusively with Tailwind CSS.
    *   **Do not modify** the files within `src/components/ui/` directly.
*   **Styling**:
    *   All styling must be done using **Tailwind CSS** utility classes. Avoid inline styles or separate CSS files for components unless absolutely necessary for global styles (e.g., `src/index.css`).
*   **Routing**:
    *   Use `react-router-dom` for all application navigation.
    *   All main application routes should be defined in `src/App.tsx`.
*   **Data Fetching**:
    *   For fetching, caching, and synchronizing server state, use **React Query (`@tanstack/react-query`)**.
*   **Icons**:
    *   Use icons from the **`lucide-react`** library.
*   **Forms**:
    *   Implement forms using **React Hook Form** for state management and validation.
    *   For schema validation, use **Zod** in conjunction with `@hookform/resolvers`.
*   **Toasts/Notifications**:
    *   For displaying user notifications (toasts), use the **`sonner`** library.
*   **Backend Interactions**:
    *   All interactions with the database, authentication, and serverless functions must be done via the **Supabase client (`@supabase/supabase-js`)** as configured in `src/integrations/supabase/client.ts`.
    *   For server-side logic, utilize **Supabase Edge Functions** as demonstrated in the `supabase/functions/` directory.