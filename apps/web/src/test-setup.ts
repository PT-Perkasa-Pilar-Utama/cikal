import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tanpa `globals: true`, Testing Library tidak membersihkan DOM otomatis di antara test.
afterEach(cleanup);

// jsdom tidak mengimplementasikan scrollTo; router memanggilnya saat navigasi.
window.scrollTo = () => undefined;
