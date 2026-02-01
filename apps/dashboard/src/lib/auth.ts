import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@cio/database";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true
    },
    user: {
        additionalFields: {
            username: {
                type: "string",
                required: false,
            },
            fullname: {
                type: "string",
                required: false,
            },
            role: {
                type: "string",
                required: false,
            }
        }
    }
});
