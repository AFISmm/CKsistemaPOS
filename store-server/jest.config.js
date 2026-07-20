/**
 * Config Jest con dos proyectos (ver ADR-0007 punto 5 y README.md):
 *  - "unit": reglas de negocio puras (calculo de impuesto, guard RBAC). No
 *    tocan base de datos; corren en cualquier entorno sin Docker.
 *  - "integration": requieren PostgreSQL real (docker-compose.test.yml) via
 *    DATABASE_URL. Se seleccionan por separado con --selectProjects.
 */
module.exports = {
  testTimeout: 30000,
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      rootDir: ".",
      testMatch: ["<rootDir>/test/unit/**/*.spec.ts"],
      transform: { "^.+\\.(t|j)s$": "ts-jest" },
      moduleFileExtensions: ["js", "json", "ts"],
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      rootDir: ".",
      testMatch: ["<rootDir>/test/integration/**/*.spec.ts"],
      transform: { "^.+\\.(t|j)s$": "ts-jest" },
      moduleFileExtensions: ["js", "json", "ts"],
    },
  ],
};
