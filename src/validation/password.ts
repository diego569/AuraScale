import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/, "Password requires a lowercase letter.")
  .regex(/[A-Z]/, "Password requires an uppercase letter.")
  .regex(/[0-9]/, "Password requires a number.");
