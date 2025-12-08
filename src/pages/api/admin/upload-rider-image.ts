import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export const config = {
   api: {
      bodyParser: {
         sizeLimit: "10mb",
      },
   },
};

if (
   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
   !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
   // noop
}

const supabase =
   process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(
           process.env.NEXT_PUBLIC_SUPABASE_URL,
           process.env.SUPABASE_SERVICE_ROLE_KEY
        )
      : (null as any);

export default async function handler(
   req: NextApiRequest,
   res: NextApiResponse
) {
   if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
   if (!supabase)
      return res.status(500).json({ error: "Supabase not configured" });

   try {
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const { data: userResp, error: userErr } = await supabase.auth.getUser(
         token as any
      );
      if (userErr || !userResp?.user) {
         return res.status(401).json({ error: "Invalid token" });
      }
      const userId = userResp.user.id;

      const { data: roles, error: roleErr } = await supabase
         .from("user_roles")
         .select("role")
         .eq("user_id", userId);
      if (roleErr)
         return res.status(500).json({ error: roleErr.message || roleErr });
      const isAdmin =
         Array.isArray(roles) && roles.some((r: any) => r.role === "admin");
      if (!isAdmin) return res.status(403).json({ error: "Forbidden" });

      const { filename, base64 } = req.body || {};
      if (!filename || !base64)
         return res.status(400).json({ error: "filename and base64 required" });

      const buffer = Buffer.from(base64, "base64");
      const objectPath = `${Date.now()}-${filename}`;
      const { error: upErr } = await (supabase as any).storage
         .from("rider-images")
         .upload(objectPath, buffer, {
            contentType: "application/octet-stream",
            upsert: false,
         });
      if (upErr) return res.status(400).json({ error: upErr.message || upErr });
      const { data } = (supabase as any).storage
         .from("rider-images")
         .getPublicUrl(objectPath);

      return res.status(200).json({ url: data?.publicUrl });
   } catch (err: any) {
      console.error("upload-rider-image failed", err);
      return res.status(500).json({ error: err?.message || "Failed" });
   }
}
