/**
 * The Student Support Library data lives in shared/studentSupportLibrary.ts,
 * because the server's route registry, SEO, prerender list and guard tests
 * read the same records the page renders. This file only re-exports it for
 * the client's existing import path.
 */
export * from "@shared/studentSupportLibrary";
