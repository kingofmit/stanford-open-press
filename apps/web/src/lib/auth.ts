import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@stanford-press/database";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    {
      id: "orcid",
      name: "ORCID",
      type: "oauth",
      authorization: {
        url: "https://orcid.org/oauth/authorize",
        params: { scope: "/authenticate openid" },
      },
      token: "https://orcid.org/oauth/token",
      userinfo: "https://orcid.org/oauth/userinfo",
      clientId: process.env.ORCID_CLIENT_ID,
      clientSecret: process.env.ORCID_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.given_name,
          email: profile.email,
          orcid: profile.sub,
        };
      },
    },
    {
      id: "email",
      type: "email",
      name: "Email",
      from: process.env.EMAIL_FROM || "noreply@press.stanford.edu",
      server: process.env.EMAIL_SERVER || "",
      maxAge: 24 * 60 * 60,
      async sendVerificationRequest({ identifier: email, url }) {
        // In development, log the magic link
        if (process.env.NODE_ENV === "development") {
          console.log(`\n✉️  Magic link for ${email}:\n${url}\n`);
          return;
        }
        // In production, send email via fetch to Resend API
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "noreply@press.stanford.edu",
            to: email,
            subject: "Sign in to Stanford Open Press",
            html: `
              <div style="max-width: 480px; margin: 0 auto; font-family: sans-serif;">
                <h2 style="color: #8C1515;">Stanford Open Press</h2>
                <p>Click the link below to sign in:</p>
                <a href="${url}" style="display: inline-block; background: #B1040E; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                  Sign In
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 24px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `,
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed to send email: ${res.status}`);
        }
      },
    },
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login/error",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

const nextAuth = NextAuth(authConfig);

export const handlers: typeof nextAuth.handlers = nextAuth.handlers;
export const auth: typeof nextAuth.auth = nextAuth.auth;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
