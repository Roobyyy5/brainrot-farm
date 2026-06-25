import { prisma } from "../src/lib/prisma.js";
import { signAccessToken } from "../src/lib/jwt.js";

const username = process.argv[2] ?? "demo_farmer";
const user = await prisma.user.findUniqueOrThrow({ where: { username } });
console.log(signAccessToken({ sub: user.id, username: user.username, isAdmin: user.isAdmin }));
await prisma.$disconnect();
