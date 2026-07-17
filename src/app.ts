import cookieParser from "cookie-parser";
import express from "express";

import "#db";
import { errorHandler, notFound, timeLogger } from "#middlewares";
import { authRouter, taskRouter } from "#routers";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(timeLogger);

app.get("/", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "Task Manager API is running",
  });
});

app.use("/auth", authRouter);
app.use("/tasks", taskRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
