/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    VERTEX_AI_LOCATION: process.env.VERTEX_AI_LOCATION,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_AGENT_ID_JAPANESE: process.env.ELEVENLABS_AGENT_ID_JAPANESE,
    ELEVENLABS_AGENT_ID_ENGLISH: process.env.ELEVENLABS_AGENT_ID_ENGLISH,
  },
};

module.exports = nextConfig;
