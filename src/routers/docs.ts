import { Router } from "express";
import swaggerJSDoc, { type Options } from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import packageJson from "../../package.json" with { type: "json" };

export const docsRouter = Router();

const options: Options = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "Task Manager API",
      version: packageJson.version,
      description: "API documentation for authentication and task management.",
    },
    servers: [{ url: "/", description: "Current server" }],
    tags: [
      { name: "Authentication", description: "Account and token operations" },
      { name: "Tasks", description: "Task management operations" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        refreshToken: {
          type: "apiKey",
          in: "cookie",
          name: "refreshToken",
        },
      },
    },
  },
  apis: ["./src/controllers/*.ts", "./src/schemas/*.ts"],
};
const swaggerSpec = swaggerJSDoc(options);

docsRouter.get("/openapi.json", (_request, response) => {
  response.json(swaggerSpec);
});
docsRouter.use("/", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
