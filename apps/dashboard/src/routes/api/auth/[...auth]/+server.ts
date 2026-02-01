import { auth } from "$lib/auth";
import { toSvelteKitHandler } from "better-auth/svelte-kit";

export const { GET, POST } = toSvelteKitHandler(auth);
