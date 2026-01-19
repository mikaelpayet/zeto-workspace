import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { AppController } from "./controllers/app.controller.js";
import { ApiKeyGuard } from "./guards/apiKey.guard.js";
import setFirebaseConfig from "./firebase/firebase.config.js";
import chatRoute from "./routes/chat.route";
import upload from "./routes/upload.route";

import { DataController } from "./controllers/data.controller";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

setFirebaseConfig();

const appController = new AppController();
app.use("/app", ApiKeyGuard.central, appController.router);

app.use("/api/openai", ApiKeyGuard.central, chatRoute);
app.use("/api/file", ApiKeyGuard.central, upload);

app.use("/db", ApiKeyGuard.central, new DataController().router);

export const zetoapi = onRequest(
  {
    region: "europe-west1",
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  app
);
