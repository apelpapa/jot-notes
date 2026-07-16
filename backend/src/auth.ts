import type { NextFunction, Request, RequestHandler, Response } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string;
}

interface SupabaseUserResponse {
  id?: unknown;
  email?: unknown;
  user_metadata?: {
    first_name?: unknown;
  };
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

const unauthorized = (res: Response) => {
  return res.status(401).json({ error: "Authentication required" });
};

export function createAuthMiddleware(supabaseUrl: string, publishableKey: string): RequestHandler {
  const userEndpoint = new URL("/auth/v1/user", supabaseUrl).toString();

  return async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      unauthorized(res);
      return;
    }

    const accessToken = authorization.slice("Bearer ".length).trim();
    if (!accessToken) {
      unauthorized(res);
      return;
    }

    try {
      const authResponse = await fetch(userEndpoint, {
        headers: {
          apikey: publishableKey,
          authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(5_000),
      });

      if (authResponse.status === 401 || authResponse.status === 403) {
        unauthorized(res);
        return;
      }

      if (!authResponse.ok) {
        console.error("Supabase user verification failed", authResponse.status);
        res.status(503).json({ error: "Authentication service temporarily unavailable" });
        return;
      }

      const data = await authResponse.json() as SupabaseUserResponse;
      if (typeof data.id !== "string" || typeof data.email !== "string") {
        unauthorized(res);
        return;
      }

      const firstName = data.user_metadata?.first_name;
      req.authUser = {
        id: data.id,
        email: data.email,
        firstName: typeof firstName === "string" ? firstName : undefined,
      };
      next();
    } catch (error) {
      console.error("Could not verify Supabase access token", error);
      res.status(503).json({ error: "Authentication service temporarily unavailable" });
    }
  };
}
