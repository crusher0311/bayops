import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Checkout redirect - configure STRIPE_CHECKOUT_URL env var with your Stripe payment link
  app.get("/api/checkout", (req, res) => {
    const checkoutUrl = process.env.STRIPE_CHECKOUT_URL;
    if (checkoutUrl) {
      return res.redirect(checkoutUrl);
    }
    // Fallback: redirect to contact form or show message
    return res.redirect("/?contact=true");
  });

  app.post(api.contact.submit.path, async (req, res) => {
    try {
      const input = api.contact.submit.input.parse(req.body);
      await storage.createContactRequest(input);
      res.status(201).json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
