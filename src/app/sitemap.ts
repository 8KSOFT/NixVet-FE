import type { MetadataRoute } from "next";

const BASE_URL = "https://nixvetapp.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/register`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/login`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/politicas-uso`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/termos-servicos-aplicativo`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
