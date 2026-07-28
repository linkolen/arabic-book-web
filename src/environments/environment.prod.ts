// Empty base URL: production is served by nginx, which reverse-proxies
// /api/* to the Spring Boot container on the same origin (Section 8).
export const environment = {
  production: true,
  apiBaseUrl: '',
};
