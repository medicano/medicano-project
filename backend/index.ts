import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/users", (_req, res) => {
  res.json({ items: [] });
});

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
