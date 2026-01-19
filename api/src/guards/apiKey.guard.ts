import { Request, Response, NextFunction } from "express";

export const ApiKeyGuard = {
  async central(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    const apiKeyHeader = req.headers["x-api-key"];
    const crentralApiKey = process.env.CENTRAL_API_KEY;

    if (!apiKeyHeader || apiKeyHeader !== crentralApiKey) {
      return res
        .status(401)
        .json({ error: "Clé API central invalide ou absente" });
    }

    next();
  },
};
