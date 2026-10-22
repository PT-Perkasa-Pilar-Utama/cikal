import "@testing-library/jest-dom/vitest";

// jsdom tidak mengimplementasikan scrollTo; router memanggilnya saat navigasi.
window.scrollTo = () => undefined;
