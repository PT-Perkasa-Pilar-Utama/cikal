import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

/** Rute dimuat lazy (code splitting); saat semua paket diuji paralel, muat pertama bisa melewati batas bawaan 1 detik. */
const ASYNC_UTIL_TIMEOUT_MS = 5_000;
configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });

// Tanpa `globals: true`, Testing Library tidak membersihkan DOM otomatis di antara test.
afterEach(cleanup);

// jsdom tidak mengimplementasikan scrollTo; router memanggilnya saat navigasi.
window.scrollTo = () => undefined;
