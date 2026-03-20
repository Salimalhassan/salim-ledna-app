import { PrismaClient } from '@/generated/prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});
};

declare global {
  var prismag: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prismag = globalThis.prismag ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prismag = prismag;

export default prismag;