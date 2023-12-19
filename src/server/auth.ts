/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

// ref to https://www.ramielcreations.com/next-auth-google-one-tap
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { OAuth2Client } from "google-auth-library";

import { env } from "~/env";
import { db } from "~/server/db";

const googleAuthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      // ...other properties
      // role: UserRole;
    };
  }
}

interface OneTapCredentials {
  credential: string;
}
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      // The id of this credential provider. It's important to give an id because, in frontend we don't want to
      // show anything about this provider in a normal login flow
      id: "googleonetap",
      // A readable name
      name: "google-one-tap",

      // This field define what parameter we expect from the FE and what's its name. In this case "credential"
      // This field will contain the token generated by google
      credentials: {
        credential: { type: "text" },
      },
      // This is where all the logic goes
      authorize: async (credentials) => {
        // The token given by google and provided from the frontend
        const token = (credentials as unknown as OneTapCredentials).credential;
        // We use the google library to exchange the token with some information about the user
        const ticket = await googleAuthClient.verifyIdToken({
          // The token received from the interface
          idToken: token,
          // This is the google ID of your application
          audience: env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload(); // This is the user

        if (!payload) {
          throw new Error("Cannot extract payload from signin token");
        }

        // If the request went well, we received all this info from Google.
        const {
          email,
          sub,
          given_name,
          family_name,
          email_verified,
          picture: image,
        } = payload;

        // If for some reason the email is not provided, we cannot login the user with this method
        if (!email) {
          throw new Error("Email not available");
        }

        // Let's check on our DB if the user exists
        const user = await db.user.findUnique({
          where: { email: email?.toLowerCase() },
        });
        if (user) {
          // Include the desired user properties in the session
          return Promise.resolve({
            id: user.id,
            email: user.email,
            image: user.image,
          });
        } else {
          const create_user = await db.user.create({
            data: {
              email: email?.toLowerCase(),
              name: [given_name, family_name].join(" "),
              image: image,
            },
          });
          await db.account.create({
            data: {
              user: {
                connect: {
                  id: create_user.id,
                },
              },
              provider: "google",
              providerAccountId: sub,
              access_token: null,
              refresh_token: null,
              expires_at: null,

              type: "one-tap",
            },
          });
          return create_user;
        }
      },
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      console.log(session, "from server");
      console.log(user, "user.id");
      return {
        ...session,
        user: {
          ...session.user,
        },
      };
    },
    jwt({ token, account, user }) {
      console.log(token, "token");
      console.log(account, " account");
      console.log(user, " user");
      if (token) {
        token.accessToken = token.access_token;
        token.id = token.id;
        token.email = token.email;
        token.name = "name";
      }
      return token;
    },
  },

  session: {
    strategy: "jwt",
  },
  secret: env.NEXTAUTH_SECRET,
};

export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};