import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
  if (!supabase)
    return res.status(500).json({ error: "Supabase not configured" });

  if (req.method === "GET") {
    // Get the latest announcement
    const { data, error } = await supabase
      .from("announcements")
      .select("announcement")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res
      .status(200)
      .json({
        announcement:
          data?.announcement || "Due to Rainy season it will affect delivery",
      });
  }

  if (req.method === "POST") {
    const { announcement } = req.body;
    if (typeof announcement !== "string" || !announcement.trim()) {
      return res.status(400).json({ error: "Invalid announcement" });
    }
    // Insert new announcement (or update the latest one)
    const { error } = await supabase
      .from("announcements")
      .insert({ announcement });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ announcement });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
