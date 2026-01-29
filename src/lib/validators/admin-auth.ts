import { z } from "zod";

export const AdminSigninSchema = z.object({
   email: z.string().email({
      message: "Please enter a valid email address.",
   }),
   password: z.string().min(8, {
      message: "Password must be at least 8 characters long.",
   }),
   rememberMe: z.boolean().optional(),
});

export const AdminSignupSchema = z.object({
   fullName: z.string().min(2, {
      message: "Full name must be at least 2 characters long.",
   }),
   // phoneNumber: z.string().min(10, {
   //   message: "Please enter a valid phone number.",
   // }),
   email: z.string().email({
      message: "Please enter a valid email address.",
   }),
   password: z.string().min(8, {
      message: "Password must be at least 8 characters long.",
   }),
   confirmPassword: z.string().min(8, {
      message: "Passwords must match.",
   }),
   rememberMe: z.boolean().optional(),
});

export type TAdminSigninSchema = z.infer<typeof AdminSigninSchema>;
export type TAdminSignupSchema = z.infer<typeof AdminSignupSchema>;
