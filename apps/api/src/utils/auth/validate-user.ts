import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@cio/database";

const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    })
});

export async function validateUser(headers: Headers) {
    const session = await auth.api.getSession({ headers });

    if (!session) {
        throw new Error('Unauthenticated user');
    }

    return session.user;
}
