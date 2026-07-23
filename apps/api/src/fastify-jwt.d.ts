import '@fastify/jwt';

// Что лежит в токене сессии и в request.user после jwtVerify().
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
